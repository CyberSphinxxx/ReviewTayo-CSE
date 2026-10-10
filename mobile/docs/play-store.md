# Play Store preparation

Everything the console asks for, answered from the app as built. Submission itself
needs the account owner (B-EXT-3); this document is the preparation.

## Listing

- **Application id:** `com.reviewtayo.cse`
- **App name:** ReviewTayo: CSE
- **Icon:** `assets/icon.png` (512×512 or larger)
- **Feature graphic / screenshots:** not captured yet — the device pass in
  `agent/VISUAL-QA.md` produces them (light and dark, one phone size minimum).
- **Short description (≤80 chars):** _Offline CSE reviewer: daily practice, spaced
  review and mock exams._
- **Full description:** draft from the product requirements — practice that adapts to
  your weakest areas, a spaced-repetition review queue, full mock exams with a
  blueprint-scored result, a study plan built from your own study days, an honest
  progress picture (accuracy, mastery, study score), and reminders on the days you
  chose. Works with no account and no connection; signing in with Google is optional
  and only adds sync when a backend is configured.

## Data safety

- **Data collected by the developer:** none in a default build. Study data (answers,
  mastery, plans, settings) is stored on the device.
- **If the learner signs in with Google:** name, email and the provider token are held
  in the device keystore; they are sent to a ReviewTayo backend only when an API base
  URL is configured. The token is never stored in SQLite or written to logs.
- **Data shared with third parties:** none.
- **Data encrypted in transit:** yes — the transport refuses a plaintext base URL.
- **Data deletion:** clearing the app's storage or uninstalling removes everything;
  there is no server-side account to delete in v1.
- **Committed to Play's Data safety form:** the answers above, chosen literally.

## Permissions rationale

| Permission                              | Why                                                                            |
| --------------------------------------- | ------------------------------------------------------------------------------ |
| `android.permission.POST_NOTIFICATIONS` | Study reminders, requested only when the learner turns reminders on.           |
| `android.permission.VIBRATE`            | The vibration of those reminders.                                              |
| `android.permission.INTERNET`           | Progress sync — only when a backend base URL is configured.                    |
| `READ/WRITE_EXTERNAL_STORAGE`           | **Not requested.** Blocked in `app.json` and removed from the merged manifest. |

`SYSTEM_ALERT_WINDOW` appears in the debug build only (React Native's dev overlay);
it is not part of a release manifest.

## Content rating

The questionnaire is medical/legal/violence/sexuality-free: study questions about
language, mathematics, general information and clerical ability. Expect **Everyone**.
The rating is completed in the console.

## Testing track plan

1. **Internal testing** — an EAS `preview` build (or a locally signed APK) on the QA
   device; the pack's device flows in `e2e/` are run here.
2. **Closed testing** — the same build promoted to the closed track with the store
   listing draft for review feedback.
3. **Production** — an EAS `production` build (`autoIncrement` build numbers, the
   `production` channel) uploaded as an AAB, rolled out in a staged percentage.

## Signed production bundle

Two supported paths; both need the owner's credentials (B-EXT-3):

- **EAS (recommended):** `npx eas build --platform android --profile production` with
  the real EAS project id in `app.json`; EAS holds the keystore.
- **Local:** `npx expo prebuild --platform android`, then
  `./gradlew bundleRelease` with a keystore under the standard Gradle signing config.
  The keystore, its password and the upload key belong to the owner — never in git.

`eas.json` in the repo already defines `development` / `preview` / `production` with
the right `EXPO_PUBLIC_APP_ENV` per profile.
