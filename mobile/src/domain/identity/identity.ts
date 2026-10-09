/**
 * Identity.
 *
 * The app has exactly two ways to exist: as a guest on one device, or signed in
 * with Google. Guest is not a degraded state — every study feature works offline
 * and locally — it simply has no account to sync to, which is what the copy says.
 *
 * The stored record is treated as untrusted input: it is written by an older
 * build, or a device restore, or nobody at all, so it is narrowed field by field
 * rather than cast. A record that does not survive that narrowing is no identity
 * at all, and the app falls back to guest rather than showing a half-parsed name.
 */

export const AUTH_MODES = ['guest', 'google'] as const;
export type AuthMode = (typeof AUTH_MODES)[number];

/** The device's own identity: it exists without an account and never syncs. */
export interface GuestIdentity {
  readonly mode: 'guest';
  /** Generated once per install and kept; it is what a future account would claim. */
  readonly deviceId: string;
}

export interface GoogleIdentity {
  readonly mode: 'google';
  /** Google's stable subject id — the account, not the session. */
  readonly subject: string;
  readonly displayName: string;
  readonly email: string;
  readonly photoUrl: string | null;
  readonly signedInAt: string;
}

export type Identity = GuestIdentity | GoogleIdentity;

/** A signed-in account as a provider returns it, before it is stored. */
export interface GoogleAccount {
  readonly subject: string;
  readonly displayName: string;
  readonly email: string;
  readonly photoUrl: string | null;
}

export const isSignedIn = (identity: Identity): identity is GoogleIdentity =>
  identity.mode === 'google';

/** True when the identity has somewhere to sync to; a guest does not. */
export const canSync = (identity: Identity): boolean => identity.mode === 'google';

/** The id an event is attributed to: the account's subject, or the device's id. */
export const identityActorId = (identity: Identity): string =>
  identity.mode === 'google' ? identity.subject : identity.deviceId;

/** `Guest` / the account's name. */
export const displayNameOf = (identity: Identity): string =>
  identity.mode === 'google' ? identity.displayName : 'Guest';

/** What a settings row shows under the name. */
export const describeIdentitySubtitle = (identity: Identity): string =>
  identity.mode === 'google' ? identity.email : 'Saved on this device only';

/** The one line that explains what signing in would change. */
export const describeIdentityDetail = (identity: Identity): string =>
  identity.mode === 'google'
    ? 'Your progress syncs to this account.'
    : 'Sign in to sync your progress across devices.';

export const describeIdentity = (
  identity: Identity,
): { readonly title: string; readonly subtitle: string; readonly detail: string } => ({
  title: displayNameOf(identity),
  subtitle: describeIdentitySubtitle(identity),
  detail: describeIdentityDetail(identity),
});

/** The avatar letter; `G` for a guest, the name's first letter otherwise. */
export const identityInitial = (identity: Identity): string => {
  const name = displayNameOf(identity).trim();
  const first = name.slice(0, 1);
  return first.length === 0 ? '?' : first.toUpperCase();
};

const readString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

/**
 * Narrows a stored JSON value into a Google identity. Anything that is not one —
 * a guest marker, a truncated record, a different shape entirely — is `null`.
 */
export const parseStoredGoogleIdentity = (value: unknown): GoogleIdentity | null => {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  if (record.mode !== 'google') return null;

  const subject = readString(record.subject);
  const displayName = readString(record.displayName);
  const email = readString(record.email);
  const signedInAt = readString(record.signedInAt);
  if (subject === null || email === null || signedInAt === null) return null;

  return {
    mode: 'google',
    subject,
    displayName: displayName ?? email.split('@')[0] ?? 'There',
    email,
    photoUrl: readString(record.photoUrl),
    signedInAt,
  };
};

/** Builds the stored record from a provider account and the instant of sign-in. */
export const googleIdentityFrom = (account: GoogleAccount, signedInAt: string): GoogleIdentity => ({
  mode: 'google',
  subject: account.subject,
  displayName: account.displayName,
  email: account.email,
  photoUrl: account.photoUrl,
  signedInAt,
});

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Decodes a base64url segment to UTF-8 text without depending on a platform
 * global, so the domain stays pure and runs identically in Node and Hermes.
 */
const decodeBase64Url = (segment: string): string => {
  const binary = segment.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
  let bits = 0;
  let accumulator = 0;
  const bytes: number[] = [];

  for (const character of binary) {
    const index = BASE64_ALPHABET.indexOf(character);
    if (index === -1) throw new Error('Not base64url.');
    accumulator = (accumulator << 6) | index;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((accumulator >> bits) & 0xff);
    }
  }

  // Interpret the bytes as UTF-8. `escape`/`decodeURIComponent` is the shortest
  // correct path here; both exist in Node and Hermes.
  let text = '';
  for (const byte of bytes) text += `%${byte.toString(16).padStart(2, '0')}`;
  return decodeURIComponent(text);
};

/**
 * Reads the payload of an OIDC id token.
 *
 * This is deliberately not a JWT verification: the token came from the token
 * endpoint over TLS and is never trusted for authorisation — the server verifies
 * it — so the client's only need is to read the subject, name and email it
 * already has the right to see. Anything malformed returns `null`.
 */
export const parseGoogleIdToken = (token: string): GoogleAccount | null => {
  const parts = token.split('.');
  const payload = parts[1];
  if (parts.length !== 3 || payload === undefined || payload.length === 0) return null;

  try {
    const decoded: unknown = JSON.parse(decodeBase64Url(payload));
    if (typeof decoded !== 'object' || decoded === null) return null;
    const record = decoded as Record<string, unknown>;

    const subject = readString(record.sub);
    const email = readString(record.email);
    if (subject === null || email === null) return null;

    return {
      subject,
      email,
      displayName: readString(record.name) ?? email.split('@')[0] ?? 'There',
      photoUrl: readString(record.picture),
    };
  } catch {
    return null;
  }
};
