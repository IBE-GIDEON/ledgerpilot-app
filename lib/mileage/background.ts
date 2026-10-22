import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { isExpoGo } from '@/lib/config/runtime';

const MILEAGE_TASK_NAME = 'ledgerpilot-background-mileage';
const MILEAGE_STORAGE_KEY = '@ledgerpilot/background-mileage';
const MIN_DRIVE_MILES = 0.8;
const IDLE_FINISH_MS = 4 * 60 * 1000;

export type PendingDriveSuggestion = {
  id: string;
  endedAt: string;
  endLabel: string;
  miles: number;
  startedAt: string;
  startLabel: string;
};

type TrackerPoint = {
  latitude: number;
  longitude: number;
  speed: number;
  timestamp: number;
};

type CurrentDrive = {
  id: string;
  lastMovingAt: number;
  lastPoint: TrackerPoint;
  lastTimestamp: number;
  startedAt: number;
  totalMiles: number;
};

type MileageTrackerState = {
  currentDrive: CurrentDrive | null;
  pendingDrives: PendingDriveSuggestion[];
  trackingEnabled: boolean;
};

const defaultTrackerState: MileageTrackerState = {
  currentDrive: null,
  pendingDrives: [],
  trackingEnabled: false,
};

function milesBetween(first: TrackerPoint, second: TrackerPoint) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;
  const latitudeDelta = toRadians(second.latitude - first.latitude);
  const longitudeDelta = toRadians(second.longitude - first.longitude);
  const a =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(toRadians(first.latitude)) *
      Math.cos(toRadians(second.latitude)) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);

  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildPoint(location: Location.LocationObject): TrackerPoint {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    speed: Math.max(location.coords.speed ?? 0, 0),
    timestamp: location.timestamp,
  };
}

function isLikelyDriving(currentPoint: TrackerPoint, previousPoint?: TrackerPoint | null) {
  if (currentPoint.speed >= 4) {
    return true;
  }

  if (!previousPoint) {
    return false;
  }

  return milesBetween(previousPoint, currentPoint) >= 0.12;
}

async function readTrackerState() {
  const rawState = await AsyncStorage.getItem(MILEAGE_STORAGE_KEY);

  if (!rawState) {
    return defaultTrackerState;
  }

  try {
    return {
      ...defaultTrackerState,
      ...(JSON.parse(rawState) as MileageTrackerState),
    };
  } catch {
    return defaultTrackerState;
  }
}

async function writeTrackerState(state: MileageTrackerState) {
  await AsyncStorage.setItem(MILEAGE_STORAGE_KEY, JSON.stringify(state));
}

async function processLocationBatch(locations: Location.LocationObject[]) {
  if (!locations.length) {
    return;
  }

  const state = await readTrackerState();
  let currentDrive = state.currentDrive;
  const pendingDrives = [...state.pendingDrives];

  for (const location of locations) {
    if (location.coords.accuracy != null && location.coords.accuracy > 120) {
      continue;
    }

    const point = buildPoint(location);

    if (!currentDrive) {
      if (!isLikelyDriving(point)) {
        continue;
      }

      currentDrive = {
        id: `drive-${point.timestamp}`,
        startedAt: point.timestamp,
        lastMovingAt: point.timestamp,
        lastPoint: point,
        lastTimestamp: point.timestamp,
        totalMiles: 0,
      };
      continue;
    }

    const incrementalMiles = milesBetween(currentDrive.lastPoint, point);
    const movingNow = isLikelyDriving(point, currentDrive.lastPoint);
    currentDrive.totalMiles += incrementalMiles;
    currentDrive.lastPoint = point;
    currentDrive.lastTimestamp = point.timestamp;

    if (movingNow) {
      currentDrive.lastMovingAt = point.timestamp;
    }

    const hasStoppedLongEnough = point.timestamp - currentDrive.lastMovingAt >= IDLE_FINISH_MS;

    if (hasStoppedLongEnough && currentDrive.totalMiles >= MIN_DRIVE_MILES) {
      pendingDrives.unshift({
        id: currentDrive.id,
        startedAt: new Date(currentDrive.startedAt).toISOString(),
        endedAt: new Date(point.timestamp).toISOString(),
        miles: Number(currentDrive.totalMiles.toFixed(1)),
        startLabel: 'Auto-detected start',
        endLabel: 'Auto-detected stop',
      });
      currentDrive = null;
    }
  }

  await writeTrackerState({
    currentDrive,
    pendingDrives: pendingDrives.slice(0, 10),
    trackingEnabled: state.trackingEnabled,
  });
}

if (!isExpoGo && !TaskManager.isTaskDefined(MILEAGE_TASK_NAME)) {
  TaskManager.defineTask(MILEAGE_TASK_NAME, async ({ data, error }) => {
    if (error) {
      console.warn('Mileage background task failed:', error.message);
      return;
    }

    const locations = (data as { locations?: Location.LocationObject[] } | undefined)?.locations;

    if (!locations?.length) {
      return;
    }

    await processLocationBatch(locations);
  });
}

export async function requestMileagePermissionsAsync() {
  const foreground = await Location.requestForegroundPermissionsAsync();

  if (foreground.status !== 'granted') {
    return false;
  }

  const background = await Location.requestBackgroundPermissionsAsync();
  return background.status === 'granted';
}

export async function startMileageTrackingAsync() {
  if (isExpoGo) {
    return false;
  }

  const allowed = await requestMileagePermissionsAsync();

  if (!allowed) {
    return false;
  }

  await Location.startLocationUpdatesAsync(MILEAGE_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    activityType: Location.ActivityType.AutomotiveNavigation,
    deferredUpdatesDistance: 200,
    deferredUpdatesInterval: 120000,
    distanceInterval: 200,
    foregroundService: {
      notificationBody: 'Lancer is watching for work drives in the background.',
      notificationColor: '#FFD13D',
      notificationTitle: 'Mileage auto-tracking is on',
    },
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    timeInterval: 120000,
  });

  const state = await readTrackerState();
  await writeTrackerState({
    ...state,
    trackingEnabled: true,
  });

  return true;
}

export async function stopMileageTrackingAsync() {
  const hasStarted = !isExpoGo && (await Location.hasStartedLocationUpdatesAsync(MILEAGE_TASK_NAME));

  if (hasStarted) {
    await Location.stopLocationUpdatesAsync(MILEAGE_TASK_NAME);
  }

  const state = await readTrackerState();
  await writeTrackerState({
    ...state,
    currentDrive: null,
    trackingEnabled: false,
  });
}

export async function getMileageTrackingSnapshotAsync() {
  const state = await readTrackerState();
  const hasStarted = !isExpoGo && (await Location.hasStartedLocationUpdatesAsync(MILEAGE_TASK_NAME));

  return {
    pendingDrives: state.pendingDrives,
    trackingEnabled: state.trackingEnabled && hasStarted,
  };
}

export async function dismissPendingDriveAsync(id: string) {
  const state = await readTrackerState();
  await writeTrackerState({
    ...state,
    pendingDrives: state.pendingDrives.filter((drive) => drive.id !== id),
  });
}
