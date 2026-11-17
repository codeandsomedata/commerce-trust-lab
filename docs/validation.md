# Validation record

The Gemini-default experience and architecture update were validated locally on November 16, 2026. The catalog uses original synthetic fixtures and a frozen observation clock. No live provider call was made; earlier platform checks are dated separately below.

| Check | Result | Scope |
|---|---|---|
| Node policy/contract tests | 51 passed | Rights, stock, freshness, exact constraints, cart changes, expiry, idempotency, mocked model protocol, Gemini default and missing-configuration behavior |
| Synthetic shopping evaluation | 12/12 passed | Expected eligible offer, abstention or clarification; no production accuracy inference |
| Firestore transaction test | Passed | Changed offer rejected; concurrent retries produce one draft; alternate retry key rejected |
| Flutter static analysis | Passed | Flutter 3.50.0 / Dart 3.14.0 |
| Flutter unit/widget tests | 15 passed | Request/health contracts, Gemini default without auto-run, configuration status, no silent fallback, Android routing, action gating, retry identity and compact layouts |
| Flutter web release build | Passed | Generated output served at `/flutter/` |
| Android debug APK build | Previously blocked: Android SDK missing (November 14) | Standard Flutter Android scaffold; not rebuilt during this UI refresh, no APK produced |
| Native Android device/emulator | Not run | Requires Android SDK and a connected device or emulator; mobile browser tests are separate |
| Firebase Hosting → Function → Firestore | Passed locally on November 14 | Seeded 4 products and 11 offers; lookup, draft action and retry exercised; Hosting chain not rerun for this refresh |
| Browser preview | Passed on November 16 | Gemini selected at startup; zero automatic agent calls; missing setup and mocked provider failure without fallback; explicit Demo query, draft, abstention and clarification; architecture page; no page errors or overflow at 320, 390, 768, 1024 and 1440 px |
| Actual Flutter browser integration | Passed | Gemini selected with a configuration-only health request; explicit Demo query, Firestore offer, user-approved draft, out-of-stock abstention, mobile tabs, zero JavaScript errors; harness blocks non-Demo requests |
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
- [Browser: Gemini default and setup status](web-initial.png)
- [Browser: approved draft](web-cart.png)
- [Browser: no eligible offer](web-abstained.png)
- [Browser: mobile recommendation](web-mobile.png)
- [Flutter: recommendation and trace](flutter-demo.png)
- [Flutter: mobile assistant](flutter-mobile.png) and [mobile trace](flutter-mobile-trace.png)
- [Architecture page](architecture-preview.png) and [canonical diagram](../web/architecture.svg)

The README, architecture, scope and walkthrough were checked against the implementation. The app and API now default to Gemini; offline execution requires explicit Demo selection. Opening either client only fetches health/configuration and never calls a model. The architecture SVG was rendered and visually inspected, and the detailed documentation includes component and request-sequence diagrams. This update does not add streaming, live inventory, reservations, checkout, or production authentication.
