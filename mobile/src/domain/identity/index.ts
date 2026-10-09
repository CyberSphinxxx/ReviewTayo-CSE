/**
 * Identity.
 *
 * The vocabulary and the reading rules for who is using the app: a guest on this
 * device, or a Google account. Everything here is pure, so the narrowing rules
 * for an untrusted stored record are tested in plain Node.
 */

export {
  AUTH_MODES,
  canSync,
  describeIdentity,
  describeIdentityDetail,
  describeIdentitySubtitle,
  displayNameOf,
  googleIdentityFrom,
  identityActorId,
  identityInitial,
  isSignedIn,
  parseGoogleIdToken,
  parseStoredGoogleIdentity,
  type AuthMode,
  type GoogleAccount,
  type GoogleIdentity,
  type GuestIdentity,
  type Identity,
} from './identity';
