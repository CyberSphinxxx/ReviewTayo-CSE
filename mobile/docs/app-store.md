# App Store preparation

The iOS half of the release, answered from the app as built. An actual archive and
submission need an Apple developer team (external; the account is the owner's).

## Listing

- **Bundle id:** `com.reviewtayo.cse` (matches the Android package)
- **Display name:** ReviewTayo: CSE
- **Icon:** `assets/icon.png`; the 1024×1024 marketing icon is generated from it at
  build time.
- **Screenshots:** not captured yet — the device pass in `agent/VISUAL-QA.md`
  produces them. iPhone 6.7" and 6.1" sets are the minimum.
- **Promotional text and description:** the same copy as the Play listing draft
  (`docs/play-store.md`).

## Configuration already in place

- `expo.ios.bundleIdentifier` = `com.reviewtayo.cse`
- `expo.ios.supportsTablet` = true
- `ITSAppUsesNonExemptEncryption` = `false` — the app uses only the OS's own HTTPS and
  the iOS keychain, so the export-compliance question is pre-answered.
- `expo.scheme` = `reviewtayo`, used for the Google sign-in return.

## Privacy (App Privacy answers)

- **Data collected by the developer:** none while signed out. If the learner signs in
  with Google, the name, email and provider token stay on the device (keychain) and go
  to a ReviewTayo backend only when an API base URL is configured.
- **Tracking:** none. No advertising identifier, no cross-app tracking, no third-party
  analytics or crash SDK in v1.
- **Data linked to the user:** only inside the app's own device storage; there is no
  server-side account to link in v1.
- **Data used for advertising:** none.

## Permission purpose strings

The app asks for no API that needs a purpose string — no camera, location, contacts,
microphone or photo library. Two plugin defaults remain in the generated Info.plist and
are documented here rather than left unexplained:

- `NSFaceIDUsageDescription` — SecureStore's plugin adds the default string; the app
  never calls the biometric-protected variant, so Face ID is never requested.
- `aps-environment=development` — expo-notifications' plugin marks the app as
  push-capable; v1 does not register for or receive remote push (reminders are local),
  so this entitlement is inert.

## Signing, TestFlight, release

1. **Signing:** an Apple team + distribution certificate and provisioning profile
   (owner-held; EAS can manage them with the owner's account).
2. **Build:** `npx eas build --platform ios --profile production` (or a local Xcode
   archive after `npx expo prebuild --platform ios`).
3. **TestFlight:** the same build submitted to TestFlight for the device pass in
   `agent/VISUAL-QA.md` — this is where the iOS half of every capture list is meant to
   be taken.
4. **Release:** submit for review with the notes below, then phased release.

## App Review notes

- The app is fully usable with no account: every feature works offline from the
  bundled content pack.
- Google sign-in is optional and only meaningful when a ReviewTayo backend is
  configured; the default build shows sign-in as unavailable rather than failing.
- Notifications are local study reminders, requested only when the learner turns them
  on; denying the permission leaves the app fully functional.
