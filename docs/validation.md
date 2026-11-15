# Validation record

Validated locally on November 14, 2026. The catalog uses original synthetic fixtures and a frozen observation clock.

| Check | Result | Scope |
|---|---|---|
| Node policy/contract tests | 48 passed | Rights, stock, freshness, exact constraints, cart changes, expiry, idempotency, mocked model protocol |
| Synthetic shopping evaluation | 12/12 passed | Expected eligible offer, abstention or clarification; no production accuracy inference |
| Firestore transaction test | Passed | Changed offer rejected; concurrent retries produce one draft; alternate retry key rejected |
| Flutter static analysis | Passed | Flutter 3.50.0 / Dart 3.14.0 |
| Flutter unit/widget tests | 12 passed | Request contract, Android emulator/USB routing, action gating, retry identity, keyboard-open input, short landscape layout |
| Flutter web release build | Passed | Generated output served at `/flutter/` |
| Android debug APK build | Blocked: Android SDK missing | Standard Flutter Android scaffold added; build attempted, no APK produced |
| Native Android device/emulator | Not run | Requires Android SDK and a connected device or emulator; mobile browser tests are separate |
| Firebase Hosting → Function → Firestore | Passed locally | Seeded 4 products and 11 offers; lookup, draft action and retry exercised |
| Browser preview | Passed | Desktop/mobile, offer and cart, failure scenarios, no console errors or horizontal overflow |
| Actual Flutter browser integration | Passed | Typed query, Firestore offer, user-approved draft, out-of-stock abstention, mobile tabs, zero JavaScript errors |
| Live Gemini API | Pending credentials | Adapters tested with mocked responses; no live success claimed |
| Cloud deployment / production SLO | Not performed | No cloud resources, real orders, availability or latency SLO established |

Commands:

```sh
npm test
npm run eval
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GCLOUD_PROJECT=demo-commerce-trust node --test functions/test/firestore.test.mjs
cd flutter_app
flutter analyze
flutter test
flutter build web --base-href /flutter/ --dart-define=API_BASE=http://127.0.0.1:8787
```

The Firestore integration test is skipped by `npm test` unless an emulator host is configured. Its isolated test documents are removed after the run. Model mock tests do not require or print real credentials.
