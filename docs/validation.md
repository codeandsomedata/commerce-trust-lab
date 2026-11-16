# Validation record

The UI and documentation refresh was validated locally on November 16, 2026. The catalog uses original synthetic fixtures and a frozen observation clock. Earlier platform checks are dated separately below.

| Check | Result | Scope |
|---|---|---|
| Node policy/contract tests | 48 passed | Rights, stock, freshness, exact constraints, cart changes, expiry, idempotency, mocked model protocol |
| Synthetic shopping evaluation | 12/12 passed | Expected eligible offer, abstention or clarification; no production accuracy inference |
| Firestore transaction test | Passed | Changed offer rejected; concurrent retries produce one draft; alternate retry key rejected |
| Flutter static analysis | Passed | Flutter 3.50.0 / Dart 3.14.0 |
| Flutter unit/widget tests | 12 passed | Request contract, Android emulator/USB routing, action gating, retry identity, keyboard-open input, short landscape layout |
| Flutter web release build | Passed | Generated output served at `/flutter/` |
| Android debug APK build | Previously blocked: Android SDK missing (November 14) | Standard Flutter Android scaffold; not rebuilt during this UI refresh, no APK produced |
| Native Android device/emulator | Not run | Requires Android SDK and a connected device or emulator; mobile browser tests are separate |
| Firebase Hosting → Function → Firestore | Passed locally on November 14 | Seeded 4 products and 11 offers; lookup, draft action and retry exercised; Hosting chain not rerun for this refresh |
| Browser preview | Passed on November 16 | Query, approved draft, three abstention scenarios, clarification, escaped input, expandable source details; no page errors or horizontal overflow at 320, 390, 768, 1024 and 1440 px |
| Actual Flutter browser integration | Passed | Typed query, Firestore offer, user-approved draft, out-of-stock abstention, mobile tabs, zero JavaScript errors |
| Live Gemini / Ollama | Not run for this refresh | Adapters tested with mocked responses; no live model success claimed |
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

## Screen review

Both clients now use light surfaces, blue primary actions, rounded cards, and concise execution summaries with expandable details. Screenshots were inspected after animations settled; the web and Flutter mobile layouts were checked separately.

- [Browser: recommendation and trace](web-demo.png)
- [Browser: approved draft](web-cart.png)
- [Browser: no eligible offer](web-abstained.png)
- [Browser: mobile recommendation](web-mobile.png)
- [Flutter: recommendation and trace](flutter-demo.png)
- [Flutter: mobile assistant](flutter-mobile.png) and [mobile trace](flutter-mobile-trace.png)

The README, architecture, scope and walkthrough were checked against the implementation. The refresh changes presentation and documentation; it does not add streaming, live inventory, reservations, checkout, or production authentication.
