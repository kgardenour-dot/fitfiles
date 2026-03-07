const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

function readBooleanEnv(value: string | undefined, defaultValue = false): boolean {
  if (!value) return defaultValue;
  return TRUE_VALUES.has(value.trim().toLowerCase());
}

export const BETA_DISABLE_PAYWALL = readBooleanEnv(
  process.env.EXPO_PUBLIC_BETA_DISABLE_PAYWALL,
  false,
);
