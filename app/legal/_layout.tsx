import { Stack } from 'expo-router';
import { Colors } from '../../src/constants/theme';

export default function LegalLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    />
  );
}
