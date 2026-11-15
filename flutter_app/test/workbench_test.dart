import 'dart:convert';

import 'package:commerce_trust_lab/catalog_api.dart';
import 'package:commerce_trust_lab/main.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:material_ui/material_ui.dart';

void main() {
  testWidgets('does not show a cart action when the API abstains', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(1300, 1000));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final api = CatalogApi(
      client: MockClient(
        (_) async => http.Response(
          jsonEncode({
            'run_id': 'test-abstain',
            'status': 'abstained',
            'mode': 'demo',
            'storage': 'fixture',
            'answer': 'No eligible offers match this request.',
            'recommendation': null,
            'action': null,
            'trace': [
              {
                'id': 'policy',
                'kind': 'policy',
                'title': 'No eligible offers',
                'data': {'reason': 'merchant_opt_out'},
              },
            ],
            'metrics': {
              'candidate_offers': 1,
              'eligible_offers': 0,
              'rejected_offers': 1,
            },
            'catalog_version': 'test-v1',
          }),
          200,
        ),
      ),
    );
    addTearDown(api.close);
    await tester.pumpWidget(CommerceTrustApp(api: api));
    await tester.tap(
      find.text('Get me Kite Hill yogurt under \$6 in Mountain View'),
    );
    await tester.pumpAndSettle();
    expect(find.text('No eligible offers match this request.'), findsOneWidget);
    expect(find.text('Prepare demo cart'), findsNothing);
    expect(find.textContaining('merchant_opt_out'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('cart action requires a user click and shows confirmed draft', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(1300, 1100));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    var cartRequests = 0;
    final api = CatalogApi(
      client: MockClient((request) async {
        if (request.url.path == '/api/cart') {
          cartRequests++;
          expect(
            jsonDecode(request.body)['idempotency_key'],
            'flutter-test-ready',
          );
          return http.Response(
            jsonEncode({
              'cart': {
                'id': 'cart-1',
                'status': 'draft',
                'total': 5.49,
                'currency': 'USD',
                'note': 'No purchase or inventory reservation.',
              },
              'trace': [],
            }),
            200,
          );
        }
        return http.Response(
          jsonEncode({
            'run_id': 'test-ready',
            'status': 'ready',
            'mode': 'demo',
            'storage': 'fixture',
            'answer': 'I found one eligible offer.',
            'recommendation': {
              'product_id': 'yogurt',
              'product_name': 'Kite Hill yogurt',
              'merchant': 'Example Market',
              'price': 5.49,
              'currency': 'USD',
              'location': 'Mountain View',
              'availability_status': 'in_stock',
              'observed_at': '2026-11-14T12:00:00Z',
              'attribution': 'Synthetic test data',
            },
            'action': {
              'type': 'prepare_cart',
              'label': 'Prepare demo cart',
              'token': 'approval-token',
            },
            'trace': [],
            'catalog_version': 'test-v1',
          }),
          200,
        );
      }),
    );
    addTearDown(api.close);
    await tester.pumpWidget(CommerceTrustApp(api: api));
    await tester.tap(
      find.text('Get me Kite Hill yogurt under \$6 in Mountain View'),
    );
    await tester.pumpAndSettle();
    expect(cartRequests, 0);
    await tester.ensureVisible(find.text('Prepare demo cart'));
    await tester.tap(find.text('Prepare demo cart'));
    await tester.pumpAndSettle();
    expect(cartRequests, 1);
    expect(find.textContaining('Demo cart draft'), findsOneWidget);
    expect(find.text('Prepare demo cart'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('compact layout exposes assistant and trace tabs', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await tester.pumpWidget(const CommerceTrustApp());
    expect(find.text('Assistant'), findsOneWidget);
    expect(find.text('API execution trace'), findsOneWidget);
    await tester.tap(find.text('API execution trace'));
    await tester.pumpAndSettle();
    expect(find.text('Every action has evidence.'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('phone keyboard leaves composer and trace usable', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(360, 640);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetViewInsets);
    var requests = 0;
    final api = CatalogApi(
      client: MockClient((request) async {
        requests++;
        expect(
          jsonDecode(request.body)['message'],
          'Vegan yogurt under \$4 in Mountain View',
        );
        return http.Response(
          jsonEncode({
            'run_id': 'keyboard-test',
            'status': 'abstained',
            'mode': 'demo',
            'storage': 'fixture',
            'answer': 'No eligible offers.',
            'action': null,
            'trace': [],
          }),
          200,
        );
      }),
    );
    addTearDown(api.close);
    await tester.pumpWidget(CommerceTrustApp(api: api));
    await tester.tap(find.byType(TextField));
    tester.view.viewInsets = const FakeViewPadding(bottom: 300);
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    expect(
      tester.getBottomRight(find.byType(TextField)).dy,
      lessThanOrEqualTo(340),
    );
    await tester.enterText(
      find.byType(TextField),
      'Vegan yogurt under \$4 in Mountain View',
    );
    await tester.tap(find.byTooltip('Send request'));
    await tester.pumpAndSettle();
    expect(requests, 1);
    expect(find.text('Prepare demo cart'), findsNothing);
    expect(tester.takeException(), isNull);
    await tester.tap(find.text('API execution trace'));
    await tester.pumpAndSettle();
    expect(find.text('Every action has evidence.'), findsOneWidget);
    expect(tester.takeException(), isNull);
    tester.view.viewInsets = const FakeViewPadding();
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'short landscape screen keeps scenario selection and send usable',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(720, 320));
      addTearDown(() => tester.binding.setSurfaceSize(null));
      await tester.pumpWidget(const CommerceTrustApp());
      expect(tester.takeException(), isNull);
      await tester.tap(find.byTooltip('Choose scenario'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Out of stock'));
      await tester.pumpAndSettle();
      expect(find.text('Out of stock'), findsOneWidget);
      expect(
        tester.getBottomRight(find.byTooltip('Send request')).dy,
        lessThanOrEqualTo(320),
      );
      await tester.tap(find.text('API execution trace'));
      await tester.pumpAndSettle();
      expect(find.text('Every action has evidence.'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
}
