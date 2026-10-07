// Expo's Jest preset stubs native modules. Supply a real UUID generator at that boundary.
jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual('node:crypto').randomUUID() }));
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);
// Map rendering is exercised in browser/native runs; unit tests control map events.
jest.mock('../../src/features/location/components/LocationMap', () => ({ LocationMap: () => null }));
