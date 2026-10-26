import { requireOptionalNativeModule } from 'expo';
import type { EventSubscription } from 'expo';

type LancerAlertsNative = {
  isAccessGranted(): boolean;
  openAccessSettings(): void;
  isIgnoringBatteryOptimizations(): boolean;
  openBatterySettings(): void;
  /** JSON: {"alerts": RawAlert[], "answers": {[id]: string}}. Clears what it returns. */
  takePending(): string;
  cancelPrompt(id: string): void;
  addListener(event: 'onAlert', listener: () => void): EventSubscription;
};

/** Present only in the installed Android app; null on iPhone, web and Expo Go. */
export const LancerAlerts = requireOptionalNativeModule<LancerAlertsNative>('LancerAlerts');
