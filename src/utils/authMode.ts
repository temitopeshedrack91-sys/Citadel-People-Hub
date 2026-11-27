export function isApiDataModeForced(
  dataMode: string | undefined = import.meta.env?.VITE_DATA_MODE
): boolean {
  return typeof dataMode === 'string' && dataMode.trim().toLowerCase() === 'api';
}

export function canUseLocalPersonaAuthentication(
  isDevelopmentBuild: boolean,
  backendEnabled: boolean,
  demoModeExplicitlyEnabled: boolean
): boolean {
  if (isApiDataModeForced()) {
    return false;
  }
  return isDevelopmentBuild && !backendEnabled && demoModeExplicitlyEnabled;
}

export function shouldUseLaravelBackend(
  isProduction: boolean,
  isConfigured: boolean,
  dataMode?: string
): boolean {
  return isProduction || isConfigured || isApiDataModeForced(dataMode);
}

export function canUseSupabaseDirectAccess(
  isDevelopmentBuild: boolean,
  backendEnabled: boolean,
  directAccessExplicitlyEnabled: boolean
): boolean {
  if (isApiDataModeForced()) {
    return false;
  }
  return isDevelopmentBuild && !backendEnabled && directAccessExplicitlyEnabled;
}
