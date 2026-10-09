import { AuthRequest, ResponseType, exchangeCodeAsync, makeRedirectUri } from 'expo-auth-session';
import { Platform } from 'react-native';

import type { GoogleAuthConfig } from '@/config/env';
import { parseGoogleIdToken, type GoogleAccount } from '@/domain/identity';
import { AppError, err, ok, toAppError, type Result } from '@/domain/result';
import { createLogger } from '@/services/logging/logger';

/**
 * Google sign-in.
 *
 * A provider boundary, as `architecture/AUTH.md` requires: the OAuth dance lives
 * here and nowhere near a screen, the result is an account plus the id token the
 * server would verify, and the whole thing is an interface so the auth service can
 * be exercised with a fake. Live client IDs are the only external dependency
 * (`agent/BLOCKERS.md`); with none configured the provider reports itself
 * unavailable instead of failing at the last moment.
 *
 * The authorization code flow with PKCE is used, and the token exchange happens
 * over TLS. The id token is never treated as proof of anything by the client — the
 * server verifies it — but it is how the app learns which account just signed in.
 */

const log = createLogger('google-auth');

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
} as const;

export interface GoogleSignInResult {
  readonly account: GoogleAccount;
  readonly idToken: string;
}

export interface GoogleAuthProvider {
  readonly kind: 'google';
  /** The client id this build would use on this platform, if any. */
  readonly clientId: string | null;
  readonly isConfigured: boolean;
  signIn(): Promise<Result<GoogleSignInResult, AppError>>;
}

export type PlatformName = 'ios' | 'android' | 'web' | 'windows' | 'macos';

/** The client id for a platform; Google registers one per platform. */
export const googleClientIdFor = (
  config: GoogleAuthConfig,
  platform: PlatformName,
): string | null => {
  switch (platform) {
    case 'ios':
      return config.iosClientId ?? config.webClientId;
    case 'android':
      return config.androidClientId ?? config.webClientId;
    default:
      return config.webClientId;
  }
};

const NOT_CONFIGURED = 'Google sign-in is not set up in this build yet.';
const CANCELLED = 'Google sign-in was cancelled.';

export const createGoogleAuthProvider = (
  config: GoogleAuthConfig,
  platform: PlatformName = Platform.OS as PlatformName,
): GoogleAuthProvider => {
  const clientId = googleClientIdFor(config, platform);

  return {
    kind: 'google',
    clientId,
    isConfigured: clientId !== null,

    async signIn(): Promise<Result<GoogleSignInResult, AppError>> {
      if (clientId === null) return err(new AppError('unsupported', NOT_CONFIGURED));

      try {
        const redirectUri = makeRedirectUri({ scheme: 'reviewtayo' });
        const request = new AuthRequest({
          clientId,
          redirectUri,
          responseType: ResponseType.Code,
          scopes: ['openid', 'profile', 'email'],
          usePKCE: true,
        });

        const prompt = await request.promptAsync(GOOGLE_DISCOVERY);
        if (prompt.type === 'error') {
          return err(
            new AppError('unauthorized', 'Google sign-in could not be completed.', {
              cause: prompt.error,
            }),
          );
        }
        if (prompt.type !== 'success') return err(new AppError('unauthorized', CANCELLED));

        const code = prompt.params?.code;
        if (typeof code !== 'string' || code.length === 0) {
          return err(new AppError('unauthorized', 'Google did not return an authorization code.'));
        }

        const tokens = await exchangeCodeAsync(
          {
            clientId,
            code,
            redirectUri,
            ...(request.codeVerifier === undefined
              ? {}
              : { extraParams: { code_verifier: request.codeVerifier } }),
          },
          GOOGLE_DISCOVERY,
        );

        const idToken = tokens.idToken;
        if (typeof idToken !== 'string' || idToken.length === 0) {
          return err(new AppError('unauthorized', 'Google did not return an identity token.'));
        }

        const account = parseGoogleIdToken(idToken);
        if (account === null) {
          return err(
            new AppError('unauthorized', 'Google returned an identity this build cannot read.'),
          );
        }

        return ok({ account, idToken });
      } catch (cause) {
        log.warn('sign-in failed', {
          cause: cause instanceof Error ? cause.message : String(cause),
        });
        return err(toAppError(cause, 'Google sign-in could not be completed.'));
      }
    },
  };
};

/** A provider that is never configured; used as the default when none is injected. */
export const unavailableGoogleAuthProvider = (): GoogleAuthProvider => ({
  kind: 'google',
  clientId: null,
  isConfigured: false,
  signIn: async () => err(new AppError('unsupported', NOT_CONFIGURED)),
});
