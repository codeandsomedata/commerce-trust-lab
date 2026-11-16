# Commerce Trust Lab · Flutter client

This Flutter app targets **Android and web**. It turns a shopping question into catalog evidence and an explicit, user-approved **draft cart**. It calls the repository's agent API; it does not read Firestore directly or ship model-provider credentials to the client.

The left pane contains the conversation and action. The right pane shows the actual tool parameters, catalog response, policy checks, and grounding prompt returned by the server. On narrow screens, the panes become tabs.

## Run locally

Start the Node API from the repository root as described in the root README. The web client defaults to `http://127.0.0.1:8787`; an Android debug build defaults to `http://10.0.2.2:8787` for the emulator.

With Flutter 3.50.0 or newer installed (Dart 3.14+):

```sh
cd flutter_app
flutter pub get
flutter run -d chrome --dart-define=API_BASE=http://127.0.0.1:8787
```

If using the project-local SDK downloaded while building this demo, substitute `.tools/flutter/bin/flutter` for `flutter` and set `PUB_CACHE="$PWD/.tools/pub-cache"` for dependency commands. The SDK and cache are ignored by Git.

Build for the root API server's `/flutter/` route:

```sh
flutter build web --release --base-href /flutter/ \
  --dart-define=API_BASE=http://127.0.0.1:8787
```

Build output is `build/web/`. The root server serves that directory directly; do not copy it over the plain-web preview.

## Android app

The Android project is in `android/`, with launcher name **Commerce Trust Lab**. Phone screens use Assistant and API trace tabs; wider screens use the side-by-side layout. The software keyboard gets space for composing a question.

### First-time setup

Follow the official [Flutter Android setup](https://docs.flutter.dev/platform-integration/android/setup) for Android Studio, its Android SDK and an emulator or USB-connected phone. Review and accept the SDK licenses yourself when prompted, then check:

```sh
flutter doctor --android-licenses
flutter doctor -v
flutter devices
```

On this Mac, Flutter and Java 21 are already available locally; **the Android SDK is not installed**. An APK build was attempted on November 14, 2026 and stopped at `No Android SDK found`. The Android scaffold and shared Dart tests are present, but there is no verified APK or native device test yet.

### Android emulator

Keep the API running on your Mac at port 8787, start an emulator in Android Studio, and run from `flutter_app/`:

```sh
flutter pub get
flutter run -d YOUR_EMULATOR_ID \
  --dart-define=API_BASE=http://10.0.2.2:8787
```

Use the device ID shown by `flutter devices`. Android's `10.0.2.2` [reaches the host computer](https://developer.android.com/studio/run/emulator-networking-address); `127.0.0.1` inside an emulator refers to the emulator itself. The explicit flag above matches the Android debug default.

### Your Android phone over USB

Enable USB debugging, connect the phone and approve its debugging prompt. Forward the phone's local port to the Mac, then run:

```sh
adb -s YOUR_DEVICE_ID reverse tcp:8787 tcp:8787
flutter run -d YOUR_DEVICE_ID \
  --dart-define=API_BASE=http://127.0.0.1:8787
```

The Mac API and USB connection must remain available. This forwarding is documented in [Android's local server guide](https://developer.android.com/develop/ui/views/layout/webapps/access-local-server).

### Build an installable demo APK

For the USB-forwarded phone configuration:

```sh
flutter build apk --debug \
  --dart-define=API_BASE=http://127.0.0.1:8787
adb -s YOUR_DEVICE_ID install -r build/app/outputs/flutter-apk/app-debug.apk
adb -s YOUR_DEVICE_ID reverse tcp:8787 tcp:8787
```

The expected output is `build/app/outputs/flutter-apk/app-debug.apk`. It is a local demonstration build, not a Play Store release. For the emulator use `API_BASE=http://10.0.2.2:8787` instead. Verify a typed query, **Prepare demo cart**, and an **Out of stock** query on the native device before presenting it.

Android's debug network configuration permits HTTP only for the emulator host and loopback addresses. Profile/release builds use HTTPS only; set `API_BASE` to your deployed API. Android profile/release builds with no endpoint show a configuration error. The template uses a debug signing key for local demonstrations; configure an owned application ID and private release signing before distribution. See [Android network security configuration](https://developer.android.com/privacy-and-security/security-config).

## Firebase Cloud Function

`API_BASE` is the base URL before `/api/agent` and `/api/cart`. The Cloud Function is named `commerce`, so its base is `https://REGION-PROJECT.cloudfunctions.net/commerce`.

```sh
flutter build web --release \
  --dart-define=API_BASE=https://REGION-PROJECT.cloudfunctions.net/commerce \
  --dart-define=DEMO_ACCESS_TOKEN=YOUR_PRIVATE_DEMO_TOKEN
```

The optional token is sent in `Authorization: Bearer ...`. A token compiled into a web app or APK can be extracted by anyone who receives it. It is only a small, private-demo access gate, not production authentication; use real user authentication and server authorization before a public launch. No Gemini API key belongs in a Dart define or the Flutter source.

## Demo walkthrough

1. Keep **Fresh offers** and **Demo · deterministic workflow** selected. Ask “Get me Kite Hill yogurt under $6 in Mountain View.”
2. Read the grounded answer and inspect the API execution trace. The displayed prices, inventory, and merchants are synthetic.
3. Click **Prepare demo cart**. This is an explicit action request; the server revalidates the offer. The result remains a draft: no order is placed and no inventory is reserved.
4. Switch to **Stale price**, **Merchant opt-out**, or **Out of stock** and repeat the request. Explain why a trustworthy platform can change its answer or abstain.
5. Optional: configure the server for Gemini or Ollama, then select that mode. The UI does not silently substitute a simulated model.

The current API responds with one completed JSON execution, so trace events appear after the response. This is an execution audit view, not token streaming or a display of a model's private reasoning. A next iteration could stream public tool events over SSE.

## Checks

```sh
flutter analyze
flutter test
flutter build web --release --base-href /flutter/
```

Tests cover Android emulator/USB API routing, request parameters, cart retry identity, API rejection handling, optional authorization, action gating after abstention, explicit cart approval, compact tabs, keyboard-open input and short landscape screens.

Verified locally on November 14, 2026 with Flutter 3.50.0 / Dart 3.14.0: all 12 tests passed, static analysis was clean, and the release web build succeeded. A headless Chrome run against the actual Flutter build and Firestore emulator also passed: the default query returned an eligible offer, explicit approval produced a draft cart, a typed out-of-stock request correctly abstained, and the mobile assistant/trace tabs worked without browser errors. Screenshots are in `../docs/flutter-*.png`.

`tool/visual_qa.cjs` reproduces the browser checks using Playwright and Chrome. Set `PLAYWRIGHT_PATH` and `CHROME_PATH` if they are not available in the usual locations; optionally set `DEMO_URL`. Run it from this directory with the local API and Firestore emulator running. The harness waits for Flutter's editable text focus before typing, and uses its accessibility tree to inspect the canvas-rendered app.

Live Gemini/Ollama and a deployed Firebase backend require separate configuration and integration checks.

## Open-source references

- [Flutter](https://github.com/flutter/flutter), BSD-3-Clause.
- [Flutter Material UI](https://pub.dev/packages/material_ui), BSD-3-Clause. Flutter 3.50 moved Material widgets into this official package.
- [Dart HTTP client](https://pub.dev/packages/http), BSD-3-Clause.
- [Flutter networking guide](https://docs.flutter.dev/cookbook/networking/send-data).

This prototype uses synthetic catalog data and does not integrate with a grocery retailer.
