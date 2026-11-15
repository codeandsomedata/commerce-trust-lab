import 'dart:convert';

import 'package:commerce_trust_lab/catalog_api.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  test(
    'Android emulator connects to the host API instead of device loopback',
    () async {
      debugDefaultTargetPlatformOverride = TargetPlatform.android;
      addTearDown(() => debugDefaultTargetPlatformOverride = null);
      final api = CatalogApi(
        client: MockClient((request) async {
          expect(request.url.toString(), 'http://10.0.2.2:8787/api/agent');
          return http.Response('{"status":"abstained"}', 200);
        }),
      );
      addTearDown(api.close);
      await api.run(message: 'test', scenario: 'baseline', mode: 'demo');
    },
  );

  test('USB device can use the explicitly forwarded loopback API', () async {
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    addTearDown(() => debugDefaultTargetPlatformOverride = null);
    final api = CatalogApi(
      baseUrl: 'http://127.0.0.1:8787/',
      client: MockClient((request) async {
        expect(request.url.toString(), 'http://127.0.0.1:8787/api/agent');
        return http.Response('{"status":"abstained"}', 200);
      }),
    );
    addTearDown(api.close);
    await api.run(message: 'test', scenario: 'baseline', mode: 'demo');
  });

  test('sends requested scenario and mode to the agent surface', () async {
    final api = CatalogApi(
      baseUrl: 'http://example.test/',
      client: MockClient((request) async {
        expect(request.url.toString(), 'http://example.test/api/agent');
        expect(request.headers['Content-Type'], 'application/json');
        expect(jsonDecode(request.body), {
          'message': 'Kite Hill yogurt under \$6 in Mountain View',
          'scenario': 'restricted',
          'mode': 'demo',
        });
        return http.Response('{"status":"abstained","action":null}', 200);
      }),
    );
    final result = await api.run(
      message: 'Kite Hill yogurt under \$6 in Mountain View',
      scenario: 'restricted',
      mode: 'demo',
    );
    expect(result['action'], isNull);
    api.close();
  });

  test(
    'preserves the approval token and retry key for cart creation',
    () async {
      final api = CatalogApi(
        client: MockClient((request) async {
          expect(request.url.path, '/api/cart');
          expect(jsonDecode(request.body), {
            'token': 'server-signed-token',
            'idempotency_key': 'run-1',
          });
          return http.Response(
            '{"cart":{"id":"cart-1","status":"draft"}}',
            200,
          );
        }),
      );
      final result = await api.prepareCart(
        token: 'server-signed-token',
        idempotencyKey: 'run-1',
      );
      expect(result['cart']['status'], 'draft');
      api.close();
    },
  );

  test(
    'surfaces rejected stale actions instead of reporting success',
    () async {
      final api = CatalogApi(
        client: MockClient(
          (_) async => http.Response(
            '{"error":{"message":"This offer is no longer eligible."}}',
            409,
          ),
        ),
      );
      await expectLater(
        api.prepareCart(token: 'expired', idempotencyKey: 'run-2'),
        throwsA(
          isA<ApiException>()
              .having((error) => error.statusCode, 'status', 409)
              .having(
                (error) => error.message,
                'message',
                'This offer is no longer eligible.',
              ),
        ),
      );
      api.close();
    },
  );

  test(
    'rejects an HTML response when API_BASE points to the frontend',
    () async {
      final api = CatalogApi(
        client: MockClient(
          (_) async => http.Response('<html>Not an API</html>', 200),
        ),
      );
      await expectLater(
        api.run(message: 'test', scenario: 'baseline', mode: 'demo'),
        throwsA(isA<ApiException>()),
      );
      api.close();
    },
  );

  test(
    'sends a configured demo gate token in the authorization header',
    () async {
      final api = CatalogApi(
        accessToken: 'test-demo-gate',
        client: MockClient((request) async {
          expect(request.headers['Authorization'], 'Bearer test-demo-gate');
          return http.Response('{"status":"abstained"}', 200);
        }),
      );
      await api.run(message: 'test', scenario: 'baseline', mode: 'demo');
      api.close();
    },
  );
}
