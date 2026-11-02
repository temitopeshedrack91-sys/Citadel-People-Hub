export function canUseLocalPersonaAuthentication(
  isDevelopmentBuild: boolean,
  backendEnabled: boolean,
  demoModeExplicitlyEnabled: boolean
): boolean {
  return isDevelopmentBuild && !backendEnabled && demoModeExplicitlyEnabled;
}

export function shouldUseLaravelBackend(isProduction: boolean, isConfigured: boolean): boolean {
  return isProduction || isConfigured;
}

export function canUseSupabaseDirectAccess(
  isDevelopmentBuild: boolean,
  backendEnabled: boolean,
  directAccessExplicitlyEnabled: boolean
): boolean {
  return isDevelopmentBuild && !backendEnabled && directAccessExplicitlyEnabled;
}
