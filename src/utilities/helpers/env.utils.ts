export function getEnvVariable(name: string, defaultValue?: string): string {
  const value = process.env[name];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    return defaultValue !== undefined ? defaultValue : '';
  }
  return value;
}
