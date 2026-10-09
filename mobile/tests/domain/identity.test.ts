import {
  canSync,
  describeIdentity,
  describeIdentitySubtitle,
  displayNameOf,
  googleIdentityFrom,
  identityActorId,
  identityInitial,
  isSignedIn,
  parseGoogleIdToken,
  parseStoredGoogleIdentity,
} from '@/domain/identity';

/**
 * Identity domain.
 *
 * The stored record is untrusted input — an older build wrote it, a device restore
 * restored it — so these tests are mostly about what happens when it is wrong: the
 * app must fall back to guest rather than show a half-parsed account.
 */

const SIGNED_IN_AT = '2026-10-10T09:00:00.000Z';

const googleRecord = (overrides: Record<string, unknown> = {}) => ({
  mode: 'google',
  subject: 'google-123',
  displayName: 'Ada Lovelace',
  email: 'ada@example.com',
  photoUrl: 'https://example.com/ada.png',
  signedInAt: SIGNED_IN_AT,
  ...overrides,
});

const idToken = (claims: Record<string, unknown>): string => {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `${header}.${payload}.signature`;
};

describe('identity', () => {
  it('describes a guest as a complete state, not a missing one', () => {
    const identity = { mode: 'guest', deviceId: 'device-1' } as const;

    expect(displayNameOf(identity)).toBe('Guest');
    expect(describeIdentitySubtitle(identity)).toBe('Saved on this device only');
    expect(describeIdentity(identity)).toEqual({
      title: 'Guest',
      subtitle: 'Saved on this device only',
      detail: 'Sign in to sync your progress across devices.',
    });
    expect(identityInitial(identity)).toBe('G');
    expect(isSignedIn(identity)).toBe(false);
    expect(canSync(identity)).toBe(false);
    expect(identityActorId(identity)).toBe('device-1');
  });

  it('describes a signed-in account from its own name and email', () => {
    const parsed = parseStoredGoogleIdentity(googleRecord());
    expect(parsed).not.toBeNull();
    if (parsed === null) return;

    expect(describeIdentity(parsed).title).toBe('Ada Lovelace');
    expect(describeIdentity(parsed).subtitle).toBe('ada@example.com');
    expect(identityInitial(parsed)).toBe('A');
    expect(isSignedIn(parsed)).toBe(true);
    expect(canSync(parsed)).toBe(true);
    expect(identityActorId(parsed)).toBe('google-123');
  });

  it('falls back to the email local part when Google returns no name', () => {
    const parsed = parseStoredGoogleIdentity(googleRecord({ displayName: '   ' }));
    expect(parsed?.displayName).toBe('ada');
  });

  it.each([
    ['a truncated record', googleRecord({ subject: undefined })],
    ['a guest marker', { mode: 'guest', deviceId: 'device-1' }],
    ['a record with no mode', { subject: 'google-123' }],
    ['an email-less record', googleRecord({ email: '' })],
    ['a record with no sign-in instant', googleRecord({ signedInAt: null })],
    ['a non-object', 'not-an-identity'],
    ['null', null],
  ])('refuses %s', (_label, value) => {
    expect(parseStoredGoogleIdentity(value)).toBeNull();
  });

  it('keeps a record with no picture', () => {
    const parsed = parseStoredGoogleIdentity(googleRecord({ photoUrl: 42 }));
    expect(parsed?.photoUrl).toBeNull();
  });

  it('builds the stored record from a provider account', () => {
    const identity = googleIdentityFrom(
      { subject: 'google-9', displayName: 'Grace', email: 'grace@example.com', photoUrl: null },
      SIGNED_IN_AT,
    );
    expect(identity).toEqual({
      mode: 'google',
      subject: 'google-9',
      displayName: 'Grace',
      email: 'grace@example.com',
      photoUrl: null,
      signedInAt: SIGNED_IN_AT,
    });
    expect(parseStoredGoogleIdentity(identity)).toEqual(identity);
  });

  describe('id tokens', () => {
    it('reads the subject, name, email and picture', () => {
      const token = idToken({
        sub: 'google-123',
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        picture: 'https://example.com/ada.png',
      });

      expect(parseGoogleIdToken(token)).toEqual({
        subject: 'google-123',
        displayName: 'Ada Lovelace',
        email: 'ada@example.com',
        photoUrl: 'https://example.com/ada.png',
      });
    });

    it('decodes a UTF-8 name rather than mangling it', () => {
      const token = idToken({ sub: 'google-1', name: 'María Peña', email: 'maria@example.com' });
      expect(parseGoogleIdToken(token)?.displayName).toBe('María Peña');
    });

    it('needs a subject and an email', () => {
      expect(parseGoogleIdToken(idToken({ name: 'Ada' }))).toBeNull();
      expect(parseGoogleIdToken(idToken({ sub: 'google-1' }))).toBeNull();
    });

    it('refuses anything that is not a three-part token', () => {
      expect(parseGoogleIdToken('')).toBeNull();
      expect(parseGoogleIdToken('header.payload')).toBeNull();
      expect(parseGoogleIdToken('header.%%%.signature')).toBeNull();
      expect(parseGoogleIdToken('header.bm90LWpzb24.signature')).toBeNull();
    });
  });
});
