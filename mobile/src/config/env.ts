/**
 * Environment configuration.
 *
 * Only `EXPO_PUBLIC_*` values are available to the client bundle, which keeps the
 * build honest: nothing secret can leak into the app. Every value is optional so
 * the app is fully usable offline with a local-only transport when no backend is
 * configured.
 */

export type AppEnvironment = 'development' | 'preview' | 'production';

const readString = (value: string | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const readEnvironment = (value: string | undefined): AppEnvironment => {
  switch (readString(value)) {
    case 'production':
      return 'production';
    case 'preview':
      return 'preview';
    default:
      return 'development';
  }
};

export interface GoogleAuthConfig {
  readonly webClientId: string | null;
  readonly iosClientId: string | null;
  readonly androidClientId: string | null;
}

export interface AppConfig {
  readonly environment: AppEnvironment;
  readonly isProduction: boolean;
  /**
   * ReviewTayo API base URL. When null the app runs against the bundled content
   * pack and a no-op sync transport, which is the supported offline-only mode.
   */
  readonly apiBaseUrl: string | null;
  readonly googleAuth: GoogleAuthConfig;
  readonly hasLiveGoogleCredentials: boolean;
}

export const appConfig: AppConfig = (() => {
  const env = process.env as Record<string, string | undefined>;
  const apiBaseUrl = readString(env.EXPO_PUBLIC_API_BASE_URL);

  if (apiBaseUrl !== null && !/^https:\/\//.test(apiBaseUrl)) {
    // Security: plaintext transports are refused rather than silently downgraded.
    // `console` is used directly because configuration is read before the logging
    // service exists (the logger depends on this module).
    console.warn('[config] EXPO_PUBLIC_API_BASE_URL must use https:// — ignoring insecure value.');
  }

  const googleAuth: GoogleAuthConfig = {
    webClientId: readString(env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID),
    iosClientId: readString(env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID),
    androidClientId: readString(env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID),
  };

  const environment = readEnvironment(env.EXPO_PUBLIC_APP_ENV);

  return {
    environment,
    isProduction: environment === 'production',
    apiBaseUrl: apiBaseUrl !== null && /^https:\/\//.test(apiBaseUrl) ? apiBaseUrl : null,
    googleAuth,
    hasLiveGoogleCredentials: googleAuth.webClientId !== null || googleAuth.iosClientId !== null,
  };
})();
