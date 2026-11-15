'use strict';

(() => {
  const $ = (id) => document.getElementById(id);
  const state = { health: null, busy: false, response: null, trace: [], requests: new Map(), cartKeys: new Map() };
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const display = (value) => typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '');
  const humanize = (value) => display(value).replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  const money = (value, currency = 'USD') => value !== null && value !== undefined && Number.isFinite(Number(value)) ? new Intl.NumberFormat('en-US', { style: 'currency', currency: /^[A-Z]{3}$/.test(currency) ? currency : 'USD' }).format(Number(value)) : 'Unavailable';
  const check = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="m2 6 2.5 2.5L10 3"/></svg>';
  const cartIcon = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 3h2l2 10h8l2-7H6M8 17h.01M14 17h.01"/></svg>';
  const yogurtArt = '<div class="product-art" aria-hidden="true"><svg viewBox="0 0 80 95"><ellipse cx="40" cy="85" rx="24" ry="4" fill="#dce2ce"/><path d="M17 23h46l-5 56c-10 5-26 5-36 0z" fill="#fdfdf6" stroke="#d7ddc8"/><path d="M19 34h42l-3 35c-11 5-25 5-36 0z" fill="#dce6c7"/><path d="M21 47c8-8 13-11 20-9 8 2 12 9 18 5v24c-11 5-25 5-36 0z" fill="#a7bb8b"/><path d="M22 58c8-6 15-2 22-4s11-3 15-7l-1 20c-11 5-25 5-36 0z" fill="#7e9b66"/><ellipse cx="40" cy="23" rx="25" ry="5" fill="#e9eedb" stroke="#cfd9bd"/><path d="M15 22v4c15 5 35 5 50 0v-4" fill="#e3e9d4" stroke="#cfd9bd"/><ellipse cx="40" cy="22" rx="25" ry="4" fill="#f5f7ea"/><rect x="26" y="42" width="28" height="21" rx="2" fill="#f8faee"/><text x="40" y="50" text-anchor="middle" font-family="Georgia,serif" font-size="5.5" fill="#6a7d50">plant-based</text><text x="40" y="58" text-anchor="middle" font-family="Georgia,serif" font-size="8" fill="#5e7546">yogurt</text><path d="M39 36c-6 0-7-6-7-6 6 0 7 6 7 6Zm2 0c6 0 7-6 7-6-6 0-7 6-7 6Z" fill="#748d58"/></svg></div>';

  function showError(message = '') { $('error-banner').textContent = message; $('error-banner').hidden = !message; }
  function scrollChat() { $('chat-history').scrollTop = $('chat-history').scrollHeight; }
  function setBusy(busy) {
    state.busy = busy;
    $('send').disabled = busy;
    $('reset').disabled = busy;
    $('message').disabled = busy;
    $('scenario').disabled = busy;
    $('mode').disabled = busy;
    document.querySelectorAll('.suggestion').forEach((button) => { button.disabled = busy; });
    document.querySelectorAll('.cart-button').forEach((button) => { button.disabled = busy || button.dataset.completed === 'true'; });
    document.querySelector('.trace-panel').classList.toggle('run-pending', busy);
    $('chat-history').setAttribute('aria-busy', String(busy));
  }

  async function request(path, body) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);
    try {
      const response = await fetch(path, { method: body === undefined ? 'GET' : 'POST', headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: controller.signal });
      let payload;
      try { payload = await response.json(); } catch { throw new Error('The local backend returned an unexpected response. Check the server and reload.'); }
      if (!response.ok) {
        const detail = payload.message || payload.error || payload.detail || `Request failed (${response.status}).`;
        throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
      }
      return payload;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('This request timed out. Try the deterministic demo or check your configured model.');
      if (error instanceof TypeError) throw new Error('Cannot reach the demo backend. Start the server using the README instructions, then reload this page.');
      throw error;
    } finally { clearTimeout(timeout); }
  }

  function addUserMessage(message, scenario) {
    $('welcome')?.remove();
    const node = document.createElement('article'); node.className = 'chat-message user-message';
    node.innerHTML = `<div><div class="user-bubble">${escape(message)}</div><p class="message-meta">${escape(humanize(scenario))} scenario</p></div>`;
    $('chat-history').append(node); scrollChat();
  }

  function addThinking() {
    const node = document.createElement('article'); node.id = 'thinking-message'; node.className = 'chat-message assistant-message';
    node.innerHTML = '<span class="assistant-mark" aria-hidden="true">ct</span><div class="assistant-body"><div class="assistant-label">Checking the evidence</div><div class="busy-indicator" aria-label="Request in progress"><span></span><span></span><span></span></div></div>';
    $('chat-history').append(node); scrollChat();
  }

  function renderOffer(offer, action, runId) {
    const evidence = [];
    if (offer.location) evidence.push(offer.location);
    if (offer.merchant_controls?.allow_ai_display === true) evidence.push('Display permitted');
    if (offer.observed_at) evidence.push('Observation attached');
    const attribution = typeof offer.attribution === 'object' ? JSON.stringify(offer.attribution, null, 2) : offer.attribution;
    const canPrepare = action?.type === 'prepare_cart' && Boolean(action.token);
    return `<section class="offer-card" aria-label="Recommended grocery offer"><div class="offer-main">${yogurtArt}<div class="offer-info"><h3>${escape(offer.product_name)}</h3><p class="merchant">${escape(offer.merchant)}</p><div class="offer-price-line"><span class="offer-price">${money(offer.price, offer.currency)}</span><span class="stock-badge">${escape(humanize(offer.availability_status || 'availability unknown'))}</span></div></div></div><div class="offer-evidence">${evidence.map((item) => `<span>${check}${escape(item)}</span>`).join('')}</div><details class="offer-source"><summary>Inspect source & merchant controls</summary><dl><div><dt>Attribution</dt><dd>${escape(attribution || 'Not provided')}</dd></div><div><dt>Observed at (frozen fixture)</dt><dd>${escape(offer.observed_at || 'Not provided')}</dd></div><div><dt>Merchant controls</dt><dd>AI display: ${offer.merchant_controls?.allow_ai_display === true ? 'allowed' : 'not allowed'} · Cart preparation: ${offer.merchant_controls?.allow_cart === true ? 'allowed' : 'not allowed'}</dd></div><div><dt>Offer identifier</dt><dd>${escape(offer.offer_id)}</dd></div></dl></details>${canPrepare ? `<div class="offer-action"><button type="button" class="cart-button" data-run="${escape(runId)}">${cartIcon}<span>${escape(action.label || 'Prepare demo cart')}</span></button><span class="action-note">Creates a draft only.<br>No checkout or payment.</span></div>` : '<p class="offer-unavailable-note">No cart action is available for this offer.</p>'}</section>`;
  }

  function addAssistantMessage(result) {
    const node = document.createElement('article'); node.className = 'chat-message assistant-message';
    node.dataset.run = result.run_id;
    const modeLabel = result.mode === 'demo' ? 'DEMO · NO LLM' : humanize(result.mode || 'agent').toUpperCase();
    const offer = result.recommendation;
    const statusLabel = result.status === 'abstained' ? 'No eligible offer · no cart action' : result.status === 'clarify' ? 'A detail is needed before acting' : '';
    node.innerHTML = `<span class="assistant-mark" aria-hidden="true">ct</span><div class="assistant-body"><div class="assistant-label">Commerce assistant<span class="response-mode">${escape(modeLabel)}</span></div><p class="assistant-answer">${escape(result.answer || 'The backend did not return an answer.')}</p>${offer ? renderOffer(offer, result.action, result.run_id) : ''}${statusLabel ? `<span class="abstain-label">${escape(statusLabel)}</span>` : ''}<div class="cart-result" data-cart-result="${escape(result.run_id)}"></div></div>`;
    $('chat-history').append(node);
    const cartButton = node.querySelector('.cart-button');
    if (cartButton) cartButton.addEventListener('click', () => prepareCart(result.run_id, cartButton));
    scrollChat();
  }

  function highlightJSON(data) {
    let raw;
    try { raw = JSON.stringify(data ?? {}, null, 2); } catch { raw = String(data); }
    return escape(raw).replace(/(&quot;(?:[^&]|&(?!quot;))*?&quot;)(\s*:)?|\b(true|false|null|-?\d+(?:\.\d+)?)\b/g, (match, string, colon, literal) => {
      if (string) return `<span class="${colon ? 'json-key' : 'json-string'}">${string}</span>${colon || ''}`;
      return `<span class="${literal === 'null' ? 'json-null' : literal === 'true' || literal === 'false' ? 'json-boolean' : 'json-number'}">${match}</span>`;
    });
  }

  function renderTrace(trace, result) {
    state.trace = Array.isArray(trace) ? trace : [];
    $('trace-empty').hidden = state.trace.length > 0; $('trace-list').hidden = state.trace.length === 0;
    $('trace-list').innerHTML = state.trace.map((item, index) => {
      const kind = ['tool_call', 'tool_result', 'policy', 'prompt', 'action'].includes(item.kind) ? item.kind : 'tool_result';
      const duration = typeof item.duration_ms === 'number' ? `${Number(item.duration_ms.toFixed(1))} ms` : '';
      const kindLabel = kind === 'prompt' && result?.mode === 'demo' ? 'DEMO TEMPLATE' : humanize(kind).toUpperCase();
      return `<li class="trace-item"><span class="trace-sequence" aria-hidden="true">${index + 1}</span><div class="trace-item-header"><span class="trace-item-title">${escape(item.title || humanize(kind))}</span><span class="trace-duration">${duration}</span></div><details class="trace-detail kind-${kind}" ${index < 3 || kind === 'policy' || kind === 'action' ? 'open' : ''}><summary><span class="trace-kind">${escape(kindLabel)}</span></summary><pre><code>${highlightJSON(item.data)}</code></pre></details></li>`;
    }).join('');
    if (result) {
      $('metric-candidates').textContent = result.metrics?.candidate_offers ?? '—';
      $('metric-eligible').textContent = result.metrics?.eligible_offers ?? '—';
      $('metric-rejected').textContent = result.metrics?.rejected_offers ?? '—';
      $('run-id').textContent = result.run_id || 'Not returned';
      $('run-id').title = result.run_id || '';
      $('storage-label').textContent = `Storage: ${result.storage || state.health?.storage || 'unknown'}`;
      $('catalog-label').textContent = result.catalog_version ? `Catalog: ${result.catalog_version}` : 'Frozen synthetic fixtures';
      $('execution-badge').textContent = result.mode === 'demo' ? 'DETERMINISTIC DEMO' : `${humanize(result.mode || 'agent').toUpperCase()} AGENT`;
    }
    $('trace-status').textContent = `${state.trace.length} observable ${state.trace.length === 1 ? 'operation' : 'operations'}`;
    $('trace-scroll').scrollTop = 0;
  }

  async function runQuery(explicitMessage) {
    if (state.busy) return;
    const message = (explicitMessage || $('message').value).trim();
    if (!message) { $('message').focus(); return; }
    const scenario = $('scenario').value;
    const mode = $('mode').value;
    if (!state.health?.modes?.[mode]) { showError('This execution mode is not configured. Choose Demo, or configure the model using the README.'); return; }
    showError(); addUserMessage(message, scenario); addThinking();
    $('message').value = ''; setBusy(true); $('trace-status').textContent = 'Checking catalog & policy…';
    try {
      const result = await request('/api/agent', { message, scenario, mode });
      state.response = result; state.requests.set(result.run_id, result);
      $('thinking-message')?.remove(); addAssistantMessage(result); renderTrace(result.trace || [], result);
    } catch (error) {
      $('thinking-message')?.remove(); showError(error.message);
      $('message').value = message;
      $('trace-status').textContent = state.response ? 'Previous run · new request failed' : 'Request failed';
    } finally { setBusy(false); scrollChat(); }
  }

  function cartMarkup(cart) {
    const items = Array.isArray(cart.items) ? cart.items : [];
    const itemRows = items.map((item) => {
      if (typeof item === 'string') return `<li>${escape(item)}</li>`;
      const name = item.product_name || item.name || item.title || item.product_id || item.offer_id || 'Catalog item';
      const quantity = item.quantity ?? 1;
      return `<li>${escape(quantity)} × ${escape(name)}${item.price !== undefined ? ` · ${money(item.price, cart.currency)}` : ''}</li>`;
    }).join('');
    return `<section class="cart-summary" aria-label="Prepared draft cart"><div class="cart-summary-heading"><h3>Your demo cart is prepared.</h3><span class="draft-badge">${escape(humanize(cart.status || 'draft'))}</span></div>${itemRows ? `<ul class="cart-items">${itemRows}</ul>` : ''}<div class="cart-total"><span>Draft total</span><strong>${money(cart.total, cart.currency)}</strong></div><p style="margin-top:9px">${escape(cart.note || 'This is a demo draft. No purchase or payment has been made.')}</p><p class="cart-id">Cart ${escape(cart.id || 'identifier not provided')}</p></section>`;
  }

  async function prepareCart(runId, button) {
    if (state.busy) return;
    const result = state.requests.get(runId);
    if (!result?.action?.token) return;
    if (!state.cartKeys.has(runId)) state.cartKeys.set(runId, globalThis.crypto?.randomUUID ? crypto.randomUUID() : `demo-${Date.now()}-${Math.random().toString(16).slice(2)}`);
    const target = [...document.querySelectorAll('[data-cart-result]')].find((element) => element.dataset.cartResult === runId);
    showError(); setBusy(true); button.querySelector('span').textContent = 'Preparing…'; $('trace-status').textContent = 'Validating cart action…';
    try {
      const response = await request('/api/cart', { token: result.action.token, idempotency_key: state.cartKeys.get(runId) });
      if (!response.cart) throw new Error('The server did not return a draft cart. No completed cart can be shown.');
      target.innerHTML = cartMarkup(response.cart);
      button.dataset.completed = 'true'; button.querySelector('span').textContent = 'Draft prepared';
      state.response = result;
      renderTrace([...(result.trace || []), ...(response.trace || [])], result);
      $('trace-status').textContent = 'Cart draft prepared · no purchase';
    } catch (error) {
      target.innerHTML = `<p class="card-error" role="alert">${escape(error.message)}</p>`;
      button.querySelector('span').textContent = result.action.label || 'Prepare demo cart';
      $('trace-status').textContent = 'Cart action did not complete';
    } finally { setBusy(false); scrollChat(); }
  }

  async function initialize() {
    try {
      const health = await request('/api/health'); state.health = health;
      $('storage-label').textContent = `Storage: ${health.storage || 'unknown'}`;
      $('catalog-label').textContent = health.catalog_version ? `Catalog: ${health.catalog_version}` : 'Frozen synthetic fixtures';
      for (const mode of ['gemini', 'ollama']) {
        const option = $('mode').querySelector(`option[value="${mode}"]`);
        option.disabled = !health.modes?.[mode]; option.textContent = `${humanize(mode)}${health.modes?.[mode] ? ' · configured' : ' · not configured'}`;
      }
      await runQuery();
    } catch (error) { showError(error.message); $('storage-label').textContent = 'Backend unavailable'; }
  }

  $('query-form').addEventListener('submit', (event) => { event.preventDefault(); runQuery(); });
  $('message').addEventListener('keydown', (event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); runQuery(); } });
  document.querySelectorAll('.suggestion').forEach((button) => button.addEventListener('click', () => runQuery(button.dataset.query)));
  $('reset').addEventListener('click', () => {
    if (state.busy) return;
    state.response = null; state.requests.clear(); state.cartKeys.clear(); state.trace = [];
    $('chat-history').innerHTML = '<div class="welcome" id="welcome"><span class="assistant-mark" aria-hidden="true">ct</span><div><p>Tell me what you’re looking for.</p><p class="welcome-detail">I’ll check the catalog and merchant rules before suggesting an action.</p></div></div>';
    $('message').value = 'Get me Kite Hill yogurt under $6 in Mountain View';
    $('scenario').value = 'baseline'; $('mode').value = 'demo';
    $('trace-list').innerHTML = ''; $('trace-list').hidden = true; $('trace-empty').hidden = false;
    $('trace-status').textContent = 'Ready to inspect'; $('execution-badge').textContent = 'DETERMINISTIC DEMO';
    for (const id of ['metric-candidates', 'metric-eligible', 'metric-rejected']) $(id).textContent = '—';
    $('run-id').textContent = 'Waiting for a request'; showError(); $('message').focus();
  });
  initialize();
})();
