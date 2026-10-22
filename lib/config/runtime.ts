import Constants, { ExecutionEnvironment } from 'expo-constants';

// Expo Go ships a fixed set of native modules; Plaid and background location need a development build.
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
