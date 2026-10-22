import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { Badge, Button, Card, Divider, IconBox, Text } from '@/components/ds';
import { space, tabularNums } from '@/constants/theme';
import { AddTripPayload } from '@/lib/backend/payloads';
import { isExpoGo } from '@/lib/config/runtime';
import { formatDate } from '@/lib/formatters';
import {
  dismissPendingDriveAsync,
  getMileageTrackingSnapshotAsync,
  PendingDriveSuggestion,
  startMileageTrackingAsync,
  stopMileageTrackingAsync,
} from '@/lib/mileage/background';
import { useAppTheme } from '@/providers/app-theme-provider';
import { TripClassification } from '@/types/ledger';

type AutoTrackingCardProps = {
  onAddTrip: (payload: AddTripPayload) => Promise<void>;
};

/** Background drive detection and review of detected drives. Wrap in ProGate feature="autoMileage". */
export function AutoTrackingCard({ onAddTrip }: AutoTrackingCardProps) {
  if (isExpoGo) {
    return <ExpoGoNote />;
  }

  return <TrackingControls onAddTrip={onAddTrip} />;
}

function ExpoGoNote() {
  return (
    <Card>
      <View style={styles.titleRow}>
        <IconBox icon="navigate-outline" />
        <View style={styles.flex}>
          <Text variant="subheading">Auto tracking</Text>
          <Text variant="small" tone="muted">
            Installed app only
          </Text>
        </View>
      </View>
    </Card>
  );
}

function TrackingControls({ onAddTrip }: AutoTrackingCardProps) {
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [pendingDrives, setPendingDrives] = useState<PendingDriveSuggestion[]>([]);
  const [trackingBusy, setTrackingBusy] = useState(false);
  const [loadingTracking, setLoadingTracking] = useState(true);
  const { theme } = useAppTheme();

  const loadTrackingState = useCallback(async () => {
    try {
      const snapshot = await getMileageTrackingSnapshotAsync();
      setTrackingEnabled(snapshot.trackingEnabled);
      setPendingDrives(snapshot.pendingDrives);
    } catch (error) {
      console.warn('Unable to load mileage tracking state:', error);
    } finally {
      setLoadingTracking(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    getMileageTrackingSnapshotAsync()
      .then((snapshot) => {
        if (!active) return;
        setTrackingEnabled(snapshot.trackingEnabled);
        setPendingDrives(snapshot.pendingDrives);
      })
      .catch((error) => console.warn('Unable to load mileage tracking state:', error))
      .finally(() => {
        if (active) setLoadingTracking(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleToggleTracking = async () => {
    setTrackingBusy(true);

    try {
      if (trackingEnabled) {
        await stopMileageTrackingAsync();
        setTrackingEnabled(false);
        Alert.alert('Automatic tracking paused', 'Lancer has stopped watching for drives. You can still log trips by hand.');
      } else {
        const enabled = await startMileageTrackingAsync();

        if (!enabled) {
          Alert.alert(
            'Location access needed',
            'Lancer needs location access while in use and in the background to detect drives. You can change this in Settings.'
          );
          return;
        }

        setTrackingEnabled(true);
        Alert.alert(
          'Automatic tracking is on',
          'Lancer will watch for likely drives in the background and list them here for you to review.'
        );
      }
    } catch (error) {
      Alert.alert(
        'Tracking did not change',
        error instanceof Error ? error.message : 'Lancer could not change automatic tracking right now.'
      );
    } finally {
      setTrackingBusy(false);
      await loadTrackingState();
    }
  };

  const handleAccept = async (drive: PendingDriveSuggestion, classification: TripClassification) => {
    try {
      await onAddTrip({
        startLabel: drive.startLabel,
        endLabel: drive.endLabel,
        miles: drive.miles,
        purpose: 'Auto-detected drive',
        classification,
      });
      await dismissPendingDriveAsync(drive.id);
    } catch (error) {
      Alert.alert('Drive not saved', error instanceof Error ? error.message : 'Try again in a moment.');
    } finally {
      await loadTrackingState();
    }
  };

  const handleDismiss = async (driveId: string) => {
    await dismissPendingDriveAsync(driveId);
    await loadTrackingState();
  };

  return (
    <Card>
      <View style={styles.titleRow}>
        <IconBox icon="navigate-outline" />
        <Text style={styles.flex} variant="subheading">
          Auto tracking
        </Text>
        {loadingTracking ? null : <Badge label={trackingEnabled ? 'On' : 'Off'} tone={trackingEnabled ? 'positive' : 'neutral'} />}
      </View>

      {loadingTracking ? (
        <View style={styles.titleRow}>
          <ActivityIndicator color={theme.textMuted} size="small" />
          <Text variant="small" tone="muted">
            Checking
          </Text>
        </View>
      ) : (
        <>
          <Button
            fullWidth={false}
            icon={trackingEnabled ? 'pause-outline' : 'navigate-outline'}
            label={trackingEnabled ? 'Pause' : 'Turn on'}
            loading={trackingBusy}
            onPress={() => void handleToggleTracking()}
            size="small"
            variant="secondary"
          />
        </>
      )}

      {pendingDrives.length > 0 ? (
        <View style={styles.pending}>
          <Text variant="smallMedium" tone="muted">
            {`${pendingDrives.length} drive${pendingDrives.length === 1 ? '' : 's'} to review`}
          </Text>
          {pendingDrives.map((drive, index) => (
            <View key={drive.id} style={styles.drive}>
              {index > 0 ? <Divider /> : null}
              <View style={styles.titleRow}>
                <View style={styles.flex}>
                  <Text numberOfLines={1} variant="bodyMedium">
                    {`${drive.startLabel} → ${drive.endLabel}`}
                  </Text>
                  <Text numberOfLines={1} variant="small" tone="muted">
                    {formatDate(drive.startedAt)}
                  </Text>
                </View>
                <Text variant="bodyMedium" style={tabularNums}>
                  {`${drive.miles.toFixed(1)} mi`}
                </Text>
              </View>
              <View style={styles.actions}>
                <Button
                  fullWidth={false}
                  label="Business"
                  onPress={() => void handleAccept(drive, 'Business')}
                  size="small"
                  variant="secondary"
                />
                <Button
                  fullWidth={false}
                  label="Personal"
                  onPress={() => void handleAccept(drive, 'Personal')}
                  size="small"
                  variant="secondary"
                />
                <Button
                  fullWidth={false}
                  label="Dismiss"
                  onPress={() => void handleDismiss(drive.id)}
                  size="small"
                  variant="ghost"
                />
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  pending: {
    gap: space.md,
  },
  drive: {
    gap: space.sm,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
});
