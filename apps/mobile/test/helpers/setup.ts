// Expo's Jest preset stubs native modules. Supply a real UUID generator at that boundary.
jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual('node:crypto').randomUUID() }));
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);
// Map rendering is exercised in browser/native runs; unit tests control map events.
jest.mock('../../src/features/location/components/LocationMap', () => ({ LocationMap: () => null }));
jest.mock('../../src/features/search/components/ResultsMap', () => ({ ResultsMap: () => null }));
// Unit tests have no OS push service. Keep the native event subscription contract;
// dedicated PushControl/PushListener tests override this boundary and exercise delivery callbacks.
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(async () => ({ granted: false })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: false })),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  AndroidImportance: { DEFAULT: 3 },
  addPushTokenListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponseAsync: jest.fn(async () => null),
  clearLastNotificationResponseAsync: jest.fn(async () => undefined),
}));
// UI tests do not own a microphone or a media server. Focused calls tests override
// this boundary; actual LiveKit transport is verified by the local browser smoke.
jest.mock('../../src/features/calls/media', () => ({
  prepareMicrophone: jest.fn(async () => undefined),
  createMediaSession: jest.fn(() => ({ supportsSpeaker: true, connect: jest.fn(async () => undefined), mute: jest.fn(async () => undefined), speaker: jest.fn(async () => undefined), resume: jest.fn(async () => undefined), close: jest.fn(async () => undefined) })),
}));
