import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

typedef JsonMap = Map<String, dynamic>;

class CatalogApi {
  CatalogApi({http.Client? client, String? baseUrl, String? accessToken})
    : _client = client ?? http.Client(),
      _accessToken =
          accessToken ?? const String.fromEnvironment('DEMO_ACCESS_TOKEN'),
      baseUrl = (baseUrl ?? _defaultBaseUrl).replaceFirst(RegExp(r'/+$'), '');

  static String get _defaultBaseUrl {
    const configured = String.fromEnvironment('API_BASE');
    if (configured.isNotEmpty) return configured;
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      // Android's loopback is the device itself. This alias reaches the Mac
      // from an emulator; USB devices can override API_BASE with adb reverse.
      return kDebugMode ? 'http://10.0.2.2:8787' : '';
    }
    return 'http://127.0.0.1:8787';
  }

  final http.Client _client;
  final String _accessToken;
  final String baseUrl;

  Future<JsonMap> run({
    required String message,
    required String scenario,
    required String mode,
  }) => _post('/api/agent', {
    'message': message,
    'scenario': scenario,
    'mode': mode,
  });

  Future<JsonMap> prepareCart({
    required String token,
    required String idempotencyKey,
  }) => _post('/api/cart', {'token': token, 'idempotency_key': idempotencyKey});

  Future<JsonMap> _post(String path, JsonMap payload) async {
    if (baseUrl.isEmpty) {
      throw const ApiException(
        'Configure API_BASE with your HTTPS backend URL when building the app.',
        0,
      );
    }
    final response = await _client
        .post(
          Uri.parse('$baseUrl$path'),
          headers: {
            'Content-Type': 'application/json',
            if (_accessToken.isNotEmpty)
              'Authorization': 'Bearer $_accessToken',
          },
          body: jsonEncode(payload),
        )
        .timeout(const Duration(seconds: 90));
    final dynamic decoded;
    try {
      decoded = jsonDecode(response.body);
    } on FormatException {
      throw ApiException(
        'The server did not return JSON. Check API_BASE and '
        'that the API server is running.',
        response.statusCode,
      );
    }
    if (decoded is! Map<String, dynamic>) {
      throw ApiException(
        'The server returned an unexpected response.',
        response.statusCode,
      );
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final error = decoded['error'];
      final message = error is Map
          ? (error['message'] ??
                error['code'] ??
                'The API rejected this request.')
          : (error ?? decoded['message'] ?? 'The API rejected this request.');
      throw ApiException(message.toString(), response.statusCode);
    }
    return decoded;
  }

  void close() => _client.close();
}

class ApiException implements Exception {
  const ApiException(this.message, this.statusCode);
  final String message;
  final int statusCode;

  @override
  String toString() => message;
}
