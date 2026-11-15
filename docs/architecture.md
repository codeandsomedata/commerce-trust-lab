# API and trust boundaries

The Flutter client and the plain-web preview call one HTTP contract. `functions/src/service.mjs` orchestrates the same catalog/policy code in both `server.mjs` and the Firebase HTTP function `commerce`. Storage adapters implement `catalog`, `propose`, and `draft`.

| Endpoint | Method | Request | Response |
|---|---|---|---|
| `/api/health` | GET | — | Storage mode, configured model modes, synthetic fixture version |
| `/api/agent` | POST | `message`, `scenario`, `mode` | Answer, eligible recommendation, action proposal, trace, counts |
| `/api/v1/catalog/search` | POST | Structured intent | Version 1.0 eligible evidence and aggregate rejection counts |
| `/api/cart` | POST | Proposal `token`, stable `idempotency_key` | Revalidated draft or explicit error |

Example structured intent:

```json
{"category":"yogurt","brand":"Kite Hill","max_price":6,"location":"Mountain View","must_be_in_stock":true,"dietary_tags":[]}
```

`scenario` is one of `baseline`, `stale`, `restricted`, or `out_of_stock`. These are clearly labeled fixture overrides, not actual merchant changes. Model mode is `demo`, `gemini`, or `ollama`. Unknown fields on the catalog contract and unsupported user constraints fail closed.

## The model's role

1. In demo mode a bounded parser extracts supported constraints. In live mode Gemini/Ollama calls the declared `search_catalog` tool with extracted parameters.
2. An independent parser validates the intended constraints. A model cannot increase the budget, change the brand/city, ignore dietary constraints or disable stock checks.
3. The catalog service reads Firestore, checks canonical product identity and filters offers for display rights, six-hour freshness, known stock, pickup, city, budget, currency and attribution.
4. Only eligible offers enter the second model request. It chooses an evidence ID. The service validates that the ID is the lowest-priced eligible match, then renders the answer from that record.
5. The service proposes a draft-cart action. It stores a random, ten-minute proposal token tied to the offer, price, product, constraints and scenario. No cart is created until the user clicks.

This narrow planner intentionally trades general conversation for auditable behavior. The live model does real tool selection/extraction and evidence selection; it cannot directly edit the catalog, alter permissions, charge money or invent answer fields. The final prompt is an evidence-selection prompt, with a deterministic factual renderer downstream. This is an explicit product choice, not a claim that a free-form LLM answer has been verified.

## Action transaction

The Firestore adapter reads the proposal, existing draft, canonical product and offer inside one transaction. It checks expiry, original price, product constraints, display/cart permission, stock, city, currency, attribution and freshness. If valid, it writes a single draft and marks the idempotency key on the proposal. Concurrent same-key retries return the same draft; a different key for a consumed proposal is rejected. A changed offer yields HTTP 409 and requires a new search.

Returning an existing draft after a retry does not claim that it is still purchasable. A real checkout would need another readiness check and a merchant-side reservation/order protocol. No such protocol exists in this prototype.

## Data and exposure

Firestore collections represent relationships between canonical products and merchant offers. They do not make Firestore a native graph database. No client reads Firestore directly: rules deny all client reads/writes; the Admin SDK uses server IAM, so application policy remains mandatory.

Merchant-excluded row IDs, names and prices are omitted from API evidence and traces. Only aggregate exclusion counts are shown. Public offer output explicitly projects `allow_ai_display` and `allow_cart` instead of copying internal control fields. The example source URLs use `example.com` and do not represent real merchant pages.

The local HTTP server listens on loopback and accepts local UI origins. The deployed function requires a configured demo access token; this is a private-demo gate, not multi-tenant identity. Public production access needs real user/partner authentication, authorization, rate limits and session binding. Proposal tokens are bearer capabilities and should be treated accordingly. The frontend never contains the Gemini API key.

## Versioning, scale and operational limits

The catalog search response declares `api_version: 1.0`. Breaking changes should use a new `/api/v2` route with partner migration and deprecation windows. Golden response fixtures and policy tests are the proposed release gate.

Current Firestore queries are intentionally simple: a category query followed by bounded fixture-sized offer reads. A real deployment needs query limits, pagination, indexed retrieval, freshness pipelines, backpressure, fan-out budgets, caches partitioned by rights and generation, and per-partner quality/latency telemetry. No production p95 or availability SLO has been measured.

The catalog clock is frozen to make failure scenarios repeatable. A production adapter must use actual observation timestamps and a current clock. Proposals expire against the actual wall clock; cleanup/TTL policies are not yet configured.

UI trace events are the completed execution record, not live streaming or a model's private reasoning. Streaming public tool events over SSE is a potential next iteration.
