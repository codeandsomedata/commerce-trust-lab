import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:material_ui/material_ui.dart';

import 'catalog_api.dart';

const ink = Color(0xFF202124);
const primary = Color(0xFF1A73E8);
const paper = Color(0xFFF8FAFD);
const line = Color(0xFFDADCE0);
const traceBackground = Color(0xFFFFFFFF);
const secondaryInk = Color(0xFF5F6368);
const success = Color(0xFF137333);

void main() => runApp(const CommerceTrustApp());

class CommerceTrustApp extends StatelessWidget {
  const CommerceTrustApp({super.key, this.api});
  final CatalogApi? api;

  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'Commerce Trust Lab',
    debugShowCheckedModeBanner: false,
    theme: ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(seedColor: primary).copyWith(
        primary: primary,
        onPrimary: Colors.white,
        surface: Colors.white,
        surfaceTint: Colors.transparent,
      ),
      scaffoldBackgroundColor: paper,
      textTheme: const TextTheme(
        bodyMedium: TextStyle(color: ink, height: 1.45),
        bodyLarge: TextStyle(color: ink, height: 1.45),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: paper,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(24),
          borderSide: const BorderSide(color: line),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(24),
          borderSide: const BorderSide(color: line),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(24),
          borderSide: const BorderSide(color: primary, width: 1.5),
        ),
        hintStyle: const TextStyle(color: secondaryInk, fontSize: 14),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: Colors.white,
        selectedColor: const Color(0xFFE8F0FE),
        checkmarkColor: primary,
        side: const BorderSide(color: line),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 17),
          textStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
        ),
      ),
    ),
    home: AgentWorkbench(api: api),
  );
}

class _Turn {
  _Turn(this.question, this.scenario, this.mode);
  final String question;
  final String scenario;
  final String mode;
  JsonMap? result;
  JsonMap? cart;
  String? error;
  String? cartError;
  bool preparingCart = false;
}

class AgentWorkbench extends StatefulWidget {
  const AgentWorkbench({super.key, this.api});
  final CatalogApi? api;

  @override
  State<AgentWorkbench> createState() => _AgentWorkbenchState();
}

class _AgentWorkbenchState extends State<AgentWorkbench> {
  late final CatalogApi _api = widget.api ?? CatalogApi();
  final _input = TextEditingController();
  final _chatScroll = ScrollController();
  final List<_Turn> _turns = [];
  String _scenario = 'baseline';
  String _mode = 'demo';
  _Turn? _selected;
  bool _busy = false;

  static const _scenarios = {
    'baseline': 'Fresh offers',
    'stale': 'Stale price',
    'restricted': 'Merchant opt-out',
    'out_of_stock': 'Out of stock',
  };

  @override
  void dispose() {
    _input.dispose();
    _chatScroll.dispose();
    if (widget.api == null) _api.close();
    super.dispose();
  }

  void _scrollToLatest() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && _chatScroll.hasClients) {
        _chatScroll.animateTo(
          _chatScroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _ask([String? suggestion]) async {
    final text = (suggestion ?? _input.text).trim();
    if (_busy || text.isEmpty) return;
    final turn = _Turn(text, _scenario, _mode);
    setState(() {
      _turns.add(turn);
      _selected = turn;
      _busy = true;
      _input.clear();
    });
    _scrollToLatest();
    try {
      final result = await _api.run(
        message: text,
        scenario: turn.scenario,
        mode: turn.mode,
      );
      if (!mounted) return;
      setState(() => turn.result = result);
    } catch (error) {
      if (!mounted) return;
      setState(
        () => turn.error = error is ApiException
            ? error.message
            : 'Could not reach the API. Start the backend and check API_BASE. '
                  'No answer or action has been generated.',
      );
    } finally {
      if (mounted) {
        setState(() => _busy = false);
        _scrollToLatest();
      }
    }
  }

  Future<void> _prepareCart(_Turn turn) async {
    final action = turn.result?['action'];
    if (action is! Map || turn.preparingCart || turn.cart != null) return;
    final token = action['token'];
    if (token is! String || token.isEmpty) return;
    setState(() {
      turn.preparingCart = true;
      turn.cartError = null;
      _selected = turn;
    });
    try {
      // Reuse the key on retry: a network timeout must not create a second cart.
      final result = await _api.prepareCart(
        token: token,
        idempotencyKey: 'flutter-${turn.result!['run_id']}',
      );
      if (!mounted) return;
      setState(() {
        turn.cart = result;
      });
    } catch (error) {
      if (!mounted) return;
      setState(
        () => turn.cartError = error is ApiException
            ? error.message
            : 'Cart confirmation could not be checked. You can retry safely.',
      );
    } finally {
      if (mounted) {
        setState(() => turn.preparingCart = false);
        _scrollToLatest();
      }
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: LayoutBuilder(
        builder: (context, viewport) {
          // Scaffold already subtracts the keyboard inset from these constraints.
          // Keep the composer and both tabs usable in the remaining height.
          final compact = viewport.maxHeight < 560;
          return Column(
            children: [
              if (!compact) _header(),
              Expanded(
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    if (constraints.maxWidth >= 960) {
                      return Padding(
                        padding: compact
                            ? const EdgeInsets.all(8)
                            : const EdgeInsets.fromLTRB(28, 8, 28, 24),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Expanded(flex: 11, child: _chat(compact: compact)),
                            const SizedBox(width: 20),
                            Expanded(flex: 10, child: _trace(compact: compact)),
                          ],
                        ),
                      );
                    }
                    return DefaultTabController(
                      length: 2,
                      child: Column(
                        children: [
                          const TabBar(
                            tabs: [
                              Tab(text: 'Assistant'),
                              Tab(text: 'API execution trace'),
                            ],
                          ),
                          Expanded(
                            child: TabBarView(
                              children: [
                                Padding(
                                  padding: EdgeInsets.all(compact ? 8 : 12),
                                  child: _chat(compact: compact),
                                ),
                                Padding(
                                  padding: EdgeInsets.all(compact ? 8 : 12),
                                  child: _trace(compact: compact),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
            ],
          );
        },
      ),
    ),
  );

  Widget _header() => Padding(
    padding: const EdgeInsets.fromLTRB(28, 22, 28, 18),
    child: Row(
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(color: line),
            borderRadius: BorderRadius.circular(16),
          ),
          child: const Column(
            children: [
              Icon(Icons.hub_outlined, color: primary, size: 25),
              SizedBox(height: 5),
              _IdentityDots(),
            ],
          ),
        ),
        const SizedBox(width: 13),
        const Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Commerce Trust Lab',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w500,
                  letterSpacing: -0.6,
                ),
              ),
              SizedBox(height: 2),
              Text(
                'From a shopping question to a trusted action.',
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontSize: 13, color: Color(0xFF5F6368)),
              ),
            ],
          ),
        ),
        if (MediaQuery.sizeOf(context).width >= 650)
          const _Pill('SYNTHETIC CATALOG', color: Color(0xFF8A5A00)),
      ],
    ),
  );

  Widget _compactControls() => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
    child: Row(
      children: [
        Expanded(
          child: PopupMenuButton<String>(
            tooltip: 'Choose scenario',
            enabled: !_busy,
            initialValue: _scenario,
            onSelected: (value) => setState(() => _scenario = value),
            itemBuilder: (context) => [
              for (final scenario in _scenarios.entries)
                PopupMenuItem(value: scenario.key, child: Text(scenario.value)),
            ],
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 10),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      _scenarios[_scenario]!,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: primary, fontSize: 12),
                    ),
                  ),
                  const Icon(Icons.expand_more, size: 16, color: primary),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(width: 24),
        PopupMenuButton<String>(
          tooltip: 'Choose execution mode',
          enabled: !_busy,
          initialValue: _mode,
          onSelected: (value) => setState(() => _mode = value),
          itemBuilder: (context) => const [
            PopupMenuItem(
              value: 'demo',
              child: Text('Demo · deterministic workflow'),
            ),
            PopupMenuItem(
              value: 'gemini',
              child: Text('Gemini · needs server API key'),
            ),
            PopupMenuItem(
              value: 'ollama',
              child: Text('Ollama · needs local model'),
            ),
          ],
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 10),
            child: Row(
              children: [
                Text(_mode.toUpperCase(), style: const TextStyle(fontSize: 11)),
                const SizedBox(width: 6),
                const Icon(Icons.expand_more, size: 16, color: primary),
              ],
            ),
          ),
        ),
      ],
    ),
  );

  Widget _chat({bool compact = false}) => Container(
    decoration: BoxDecoration(
      color: Colors.white,
      border: Border.all(color: line),
      borderRadius: BorderRadius.circular(24),
    ),
    clipBehavior: Clip.antiAlias,
    child: Column(
      children: [
        if (compact)
          _compactControls()
        else
          ConstrainedBox(
            constraints: const BoxConstraints(maxHeight: 200),
            child: SingleChildScrollView(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(
                          Icons.chat_bubble_outline_rounded,
                          color: primary,
                          size: 18,
                        ),
                        SizedBox(width: 9),
                        Text(
                          'Shopping assistant',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: ink,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 7,
                      runSpacing: 3,
                      children: [
                        for (final scenario in _scenarios.entries)
                          ChoiceChip(
                            label: Text(
                              scenario.value,
                              style: const TextStyle(fontSize: 12),
                            ),
                            selected: _scenario == scenario.key,
                            onSelected: _busy
                                ? null
                                : (_) =>
                                      setState(() => _scenario = scenario.key),
                          ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        const Text(
                          'Execution  ',
                          style: TextStyle(fontSize: 12),
                        ),
                        Expanded(
                          child: DropdownButton<String>(
                            value: _mode,
                            isExpanded: true,
                            underline: const SizedBox.shrink(),
                            style: const TextStyle(color: ink, fontSize: 12),
                            items: const [
                              DropdownMenuItem(
                                value: 'demo',
                                child: Text('Demo · deterministic workflow'),
                              ),
                              DropdownMenuItem(
                                value: 'gemini',
                                child: Text('Gemini · needs server API key'),
                              ),
                              DropdownMenuItem(
                                value: 'ollama',
                                child: Text('Ollama · needs local model'),
                              ),
                            ],
                            onChanged: _busy
                                ? null
                                : (value) =>
                                      setState(() => _mode = value ?? 'demo'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        const Divider(height: 1, color: line),
        Expanded(
          child: ListView(
            controller: _chatScroll,
            padding: EdgeInsets.all(compact ? 12 : 22),
            children: [
              if (_turns.isEmpty) _welcome(),
              for (final turn in _turns) _turn(turn),
            ],
          ),
        ),
        const Divider(height: 1, color: line),
        Padding(
          padding: compact
              ? const EdgeInsets.all(8)
              : const EdgeInsets.fromLTRB(16, 14, 16, 12),
          child: Column(
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: TextField(
                      controller: _input,
                      minLines: 1,
                      maxLines: compact ? 1 : 4,
                      maxLength: 1000,
                      enabled: !_busy,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _ask(),
                      decoration: const InputDecoration(
                        hintText: 'Ask for a product, budget, and location…',
                        counterText: '',
                        contentPadding: EdgeInsets.all(14),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  IconButton.filled(
                    tooltip: 'Send request',
                    onPressed: _busy ? null : () => _ask(),
                    style: IconButton.styleFrom(
                      backgroundColor: primary,
                      padding: const EdgeInsets.all(15),
                    ),
                    icon: const Icon(Icons.arrow_upward),
                  ),
                ],
              ),
              if (!compact) ...[
                const SizedBox(height: 9),
                const Text(
                  'Illustrative prices and merchants. Demo carts do not place '
                  'orders or reserve inventory.',
                  style: TextStyle(fontSize: 11, color: Color(0xFF5F6368)),
                ),
              ],
            ],
          ),
        ),
      ],
    ),
  );

  Widget _welcome() => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      const SizedBox(height: 20),
      const Text.rich(
        TextSpan(
          children: [
            TextSpan(text: 'What can I help\n'),
            TextSpan(
              text: 'you find?',
              style: TextStyle(color: primary),
            ),
          ],
        ),
        style: TextStyle(
          fontSize: 36,
          fontWeight: FontWeight.w500,
          height: 1.18,
          letterSpacing: -1,
        ),
      ),
      const SizedBox(height: 18),
      const Text(
        'Ask for groceries. The backend checks the catalog, stock, '
        'freshness, and merchant permissions before offering an action.',
        style: TextStyle(color: secondaryInk, height: 1.6),
      ),
      const SizedBox(height: 24),
      for (final suggestion in [
        'Get me Kite Hill yogurt under \$6 in Mountain View',
        'Find vegan yogurt under \$4 in Mountain View',
      ])
        Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: OutlinedButton(
            style: OutlinedButton.styleFrom(
              alignment: Alignment.centerLeft,
              padding: const EdgeInsets.all(16),
              foregroundColor: ink,
              backgroundColor: paper,
              side: const BorderSide(color: line),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(18),
              ),
            ),
            onPressed: () => _ask(suggestion),
            child: Row(
              children: [
                Expanded(child: Text(suggestion)),
                const SizedBox(width: 12),
                const Icon(Icons.north_east, size: 16, color: primary),
              ],
            ),
          ),
        ),
      const SizedBox(height: 16),
      _Pill(
        _mode == 'demo'
            ? 'DEMO MODE: NO MODEL CALL'
            : '${_mode.toUpperCase()} MODE: SERVER MUST BE CONFIGURED',
        color: const Color(0xFF5F6368),
      ),
    ],
  );

  Widget _turn(_Turn turn) {
    final result = turn.result;
    final recommendation = result?['recommendation'];
    final action = result?['action'];
    final cart = turn.cart?['cart'];
    return Padding(
      padding: const EdgeInsets.only(bottom: 28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Align(
            alignment: Alignment.centerRight,
            child: Container(
              margin: const EdgeInsets.only(left: 36, bottom: 18),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: const Color(0xFFE8F0FE),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(turn.question),
            ),
          ),
          Wrap(
            spacing: 8,
            runSpacing: 6,
            children: [
              _Pill(_scenarios[turn.scenario] ?? turn.scenario),
              _Pill(
                result == null ? turn.mode : '${result['mode']}',
                color: const Color(0xFF5F6368),
              ),
              if (result?['storage'] != null)
                _Pill('${result!['storage']}', color: const Color(0xFF5F6368)),
            ],
          ),
          const SizedBox(height: 12),
          if (turn.error != null) _notice(turn.error!, error: true),
          if (result == null && turn.error == null)
            const Row(
              children: [
                SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
                SizedBox(width: 12),
                Expanded(child: Text('Checking catalog evidence…')),
              ],
            ),
          if (result != null) ...[
            SelectableText(
              '${result['answer'] ?? 'No answer returned.'}',
              style: const TextStyle(fontSize: 16, color: ink, height: 1.5),
            ),
            if (recommendation is Map) ...[
              const SizedBox(height: 16),
              _offer(recommendation),
            ],
            if (action is Map &&
                action['type'] == 'prepare_cart' &&
                cart == null) ...[
              const SizedBox(height: 14),
              FilledButton.icon(
                onPressed: turn.preparingCart ? null : () => _prepareCart(turn),
                icon: const Icon(Icons.add_shopping_cart, size: 18),
                label: Text(
                  turn.preparingCart
                      ? 'Rechecking offer…'
                      : '${action['label'] ?? 'Prepare demo cart'}',
                ),
              ),
              const SizedBox(height: 5),
              const Text(
                'You approve this action. The server rechecks eligibility.',
                style: TextStyle(fontSize: 11, color: Color(0xFF5F6368)),
              ),
            ],
            if (turn.cartError != null) ...[
              const SizedBox(height: 12),
              _notice(turn.cartError!, error: true),
            ],
            if (cart is Map) ...[
              const SizedBox(height: 14),
              _notice(
                'Demo cart ${cart['status'] ?? 'draft'} · '
                '${cart['currency'] ?? 'USD'} ${_money(cart['total'])}\n'
                '${cart['note'] ?? 'No purchase or inventory reservation.'}',
              ),
            ],
            const SizedBox(height: 8),
            TextButton.icon(
              onPressed: () => setState(() => _selected = turn),
              icon: const Icon(Icons.data_object, size: 16),
              label: Text(
                identical(_selected, turn)
                    ? 'Evidence shown in trace'
                    : 'Inspect this execution',
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _offer(Map<dynamic, dynamic> offer) => Container(
    padding: const EdgeInsets.all(17),
    decoration: BoxDecoration(
      color: paper,
      borderRadius: BorderRadius.circular(18),
      border: Border.all(color: line),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Text(
                '${offer['product_name'] ?? offer['product_id']}',
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 17,
                ),
              ),
            ),
            const SizedBox(width: 14),
            Text(
              '${offer['currency'] ?? 'USD'} ${_money(offer['price'])}',
              style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w700),
            ),
          ],
        ),
        const SizedBox(height: 7),
        Text(
          '${offer['merchant']} · ${offer['location']}',
          style: const TextStyle(fontSize: 13),
        ),
        const SizedBox(height: 9),
        Wrap(
          spacing: 8,
          runSpacing: 5,
          children: [
            _Pill(
              '${offer['availability_status'] ?? 'unknown'}',
              color: success,
            ),
            const _Pill('SYNTHETIC OFFER', color: Color(0xFF8A5A00)),
          ],
        ),
        const SizedBox(height: 10),
        SelectableText(
          'Observed: ${offer['observed_at'] ?? 'not supplied'}\n'
          'Source: ${offer['attribution'] ?? 'not supplied'}',
          style: const TextStyle(fontSize: 11, color: Color(0xFF5F6368)),
        ),
      ],
    ),
  );

  String _money(dynamic value) =>
      value is num ? value.toStringAsFixed(2) : '${value ?? '—'}';

  Widget _notice(String text, {bool error = false}) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: error ? const Color(0xFFFCE8E6) : const Color(0xFFE6F4EA),
      borderRadius: BorderRadius.circular(12),
    ),
    child: Text(
      text,
      style: TextStyle(
        fontSize: 13,
        color: error ? const Color(0xFFB3261E) : success,
      ),
    ),
  );

  Widget _trace({bool compact = false}) {
    final result = _selected?.result;
    final events = [
      if (result?['trace'] is List) ...result!['trace'] as List,
      if (_selected?.cart?['trace'] is List)
        ..._selected!.cart!['trace'] as List,
    ];
    final metrics = result?['metrics'];
    return Container(
      decoration: BoxDecoration(
        color: traceBackground,
        border: Border.all(color: line),
        borderRadius: BorderRadius.circular(24),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: EdgeInsets.all(compact ? 12 : 22),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (!compact)
                  const Row(
                    children: [
                      Icon(Icons.data_object, color: primary, size: 18),
                      SizedBox(width: 9),
                      Text(
                        'Execution trace',
                        style: TextStyle(
                          color: secondaryInk,
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                if (!compact) const SizedBox(height: 12),
                Text(
                  'Every action has evidence.',
                  maxLines: compact ? 1 : null,
                  overflow: compact ? TextOverflow.ellipsis : null,
                  style: TextStyle(
                    color: ink,
                    fontSize: compact ? 17 : 23,
                    fontWeight: FontWeight.w500,
                    letterSpacing: -0.5,
                  ),
                ),
                if (!compact) ...[
                  const SizedBox(height: 9),
                  const Text(
                    'Tool inputs, catalog results, policy decisions, and the '
                    'grounding prompt returned by the server.',
                    style: TextStyle(
                      color: Color(0xFF5F6368),
                      fontSize: 13,
                      height: 1.5,
                    ),
                  ),
                ],
                if (metrics is Map) ...[
                  SizedBox(height: compact ? 6 : 18),
                  if (compact)
                    Text(
                      '${metrics['candidate_offers']} candidates · '
                      '${metrics['eligible_offers']} eligible · '
                      '${metrics['rejected_offers']} rejected',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Color(0xFF5F6368),
                        fontSize: 11,
                      ),
                    )
                  else
                    Wrap(
                      spacing: 10,
                      runSpacing: 8,
                      children: [
                        _traceMetric('Candidates', metrics['candidate_offers']),
                        _traceMetric('Eligible', metrics['eligible_offers']),
                        _traceMetric('Rejected', metrics['rejected_offers']),
                      ],
                    ),
                ],
              ],
            ),
          ),
          const Divider(height: 1, color: Color(0xFFDADCE0)),
          Expanded(
            child: events.isEmpty
                ? SingleChildScrollView(
                    child: Padding(
                      padding: const EdgeInsets.all(28),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(22),
                            decoration: const BoxDecoration(
                              color: Color(0xFFE8F0FE),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.account_tree_outlined,
                              size: 34,
                              color: primary,
                            ),
                          ),
                          const SizedBox(height: 18),
                          Text(
                            _busy
                                ? 'Waiting for the API response…'
                                : 'Send a request to inspect its execution.',
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              color: Color(0xFF5F6368),
                              height: 1.5,
                            ),
                          ),
                          const SizedBox(height: 12),
                          const Text(
                            'Actual server events appear after completion.\n'
                            'No model reasoning or invented events are displayed.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 11,
                              color: Color(0xFF5F6368),
                              height: 1.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: events.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, index) => events[index] is Map
                        ? _TraceEvent(index: index, event: events[index] as Map)
                        : const SizedBox.shrink(),
                  ),
          ),
          Padding(
            padding: compact
                ? const EdgeInsets.all(8)
                : const EdgeInsets.fromLTRB(20, 12, 20, 16),
            child: Text(
              result == null
                  ? 'API: ${_api.baseUrl}'
                  : 'Run: ${result['run_id']}  ·  Catalog: ${result['catalog_version']}',
              maxLines: compact ? 1 : null,
              overflow: compact ? TextOverflow.ellipsis : null,
              style: const TextStyle(fontSize: 10, color: Color(0xFF5F6368)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _traceMetric(String name, dynamic count) => Container(
    padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 14),
    decoration: BoxDecoration(
      color: name == 'Eligible'
          ? const Color(0xFFE6F4EA)
          : name == 'Candidates'
          ? const Color(0xFFE8F0FE)
          : const Color(0xFFF1F3F4),
      borderRadius: BorderRadius.circular(12),
    ),
    child: Text(
      '${count ?? '—'}  $name',
      style: TextStyle(
        color: name == 'Eligible'
            ? success
            : name == 'Candidates'
            ? primary
            : secondaryInk,
        fontSize: 12,
        fontWeight: FontWeight.w500,
      ),
    ),
  );
}

class _TraceEvent extends StatelessWidget {
  const _TraceEvent({required this.index, required this.event});
  final int index;
  final Map<dynamic, dynamic> event;

  @override
  Widget build(BuildContext context) {
    final json = const JsonEncoder.withIndent('  ').convert(event['data']);
    return Material(
      color: const Color(0xFFFFFFFF),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFFDADCE0)),
      ),
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          key: PageStorageKey('${event['id']}-${event.hashCode}'),
          initiallyExpanded: index < 2,
          iconColor: const Color(0xFF1A73E8),
          collapsedIconColor: const Color(0xFF1A73E8),
          tilePadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
          title: Text(
            '${index + 1}. ${event['title'] ?? event['kind']}',
            style: const TextStyle(
              color: ink,
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
          ),
          subtitle: Text(
            '${event['kind'] ?? 'event'}'
            '${event['duration_ms'] == null ? '' : ' · ${event['duration_ms']} ms'}',
            style: const TextStyle(color: Color(0xFF5F6368), fontSize: 10),
          ),
          children: [
            Align(
              alignment: Alignment.centerRight,
              child: IconButton(
                tooltip: 'Copy event JSON',
                icon: const Icon(
                  Icons.copy_outlined,
                  size: 15,
                  color: Color(0xFF1A73E8),
                ),
                onPressed: () async {
                  await Clipboard.setData(ClipboardData(text: json));
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Event JSON copied')),
                    );
                  }
                },
              ),
            ),
            Container(
              width: double.infinity,
              margin: const EdgeInsets.fromLTRB(12, 0, 12, 12),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: paper,
                borderRadius: BorderRadius.circular(12),
              ),
              child: SelectableText(
                json,
                style: const TextStyle(
                  fontFamily: 'monospace',
                  fontSize: 11,
                  height: 1.6,
                  color: Color(0xFF3C4043),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill(this.text, {this.color = primary});
  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
    decoration: BoxDecoration(
      color: color.withAlpha(18),
      borderRadius: BorderRadius.circular(20),
    ),
    child: Text(
      text,
      style: TextStyle(
        color: color,
        fontSize: 10,
        fontWeight: FontWeight.w600,
        letterSpacing: 0.2,
      ),
    ),
  );
}

class _IdentityDots extends StatelessWidget {
  const _IdentityDots();

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      for (final color in const [
        primary,
        Color(0xFFEA4335),
        Color(0xFFFBBC04),
        Color(0xFF34A853),
      ])
        Container(
          width: 4,
          height: 4,
          margin: const EdgeInsets.symmetric(horizontal: 1),
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
    ],
  );
}
