# Commerce Trust Lab — five-minute interview demo

## Before the meeting

- Follow the repository README to start the Flutter app at `/flutter/` or the plain-web preview. Both use the same Node.js core as the Firebase adapter.
- Use **deterministic demo mode** for the rehearsed walkthrough. It needs no model download or API key. Gemini or Ollama tool orchestration is a separate configured and validated path.
- Start with the baseline scenario and clear prior demo drafts if needed for the walkthrough. Use the current UI labels and returned evidence; do not memorize invented prices or test counts.
- Keep both panes visible: the shopper experience and the platform evidence/tool trace.
- State that Kite Hill is an example brand and that prices, stock, and merchant data are synthetic. **Prepare demo cart creates a draft; it does not reserve or purchase anything.**
- The Flutter release build, static analysis and eight tests have passed. The local Firebase Hosting → Cloud Function → Firestore path has been exercised with catalog lookup, draft creation and idempotent retry. A deployed cloud service and live Gemini calls still require separate credentials and validation.

## 0:00–0:40 — Introduce the customer and your judgment

**Say:**

> “My experience spans merchant and customer workflows through FBA and Local Services Ads, and developer infrastructure through LiteRT. I wanted to connect those perspectives: how can a shared commerce platform give a shopper a trustworthy answer and support a useful next action?”
>
> “This prototype uses synthetic data. I started with one grocery request in one location. The key decision was to make product evidence and eligibility authoritative before adding model orchestration.”

## 0:40–1:35 — Show a useful answer and the platform behind it

**Do:** In the baseline scenario, submit **“Get me Kite Hill yogurt under $6 in Mountain View.”**

**Show:** The shopper's result in one pane. In the other, inspect the product/offer evidence, source timestamp, stock status, eligibility decision, and visible tool trace.

**Say:**

> “The request contains a product, a budget, and a location. The platform checks those constraints and filters for rights, freshness, and stock before any offer can be used by a model. A model cannot make an ineligible offer valid.”
>
> “The second pane makes the shared contract visible. Another client could use the same product and offer APIs without rebuilding these rules.”

**Product choice:** Useful, eligible evidence takes precedence over a superficially attractive answer.

## 1:35–2:25 — Take a bounded action

**Do:** Explicitly choose **Prepare demo cart** on an eligible offer. Show the returned draft and its status.

**Say:**

> “The agent does something useful, but the boundary is clear: this is a draft cart. It does not reserve inventory, charge a card, or place an order.”
>
> “The service revalidates the offer when the action happens. A previously valid recommendation is not permanent permission to act. The same request can be retried with the same idempotency key without creating another draft.”

**Show, if exposed in the current UI or API tools:** Retry the same draft action with the same idempotency key and inspect that the draft identifier is unchanged. Do not imply that two independent new clicks necessarily use the same key; verify the actual request behavior.

**Product choice:** Demonstrate a reliable, explicit action before expanding into checkout and fulfillment.

## 2:25–3:35 — Show how the contract behaves when evidence changes

**Do:** Switch through **stale**, **restricted**, and **out_of_stock** scenarios and repeat the request. Inspect rejection reason codes in the evidence pane. If a qualifying alternative remains, show it; otherwise show abstention.

**Say:**

> “These failures have different owners. Stale data needs a refresh path. A rights restriction needs a permission decision, not a prompt workaround. Unavailable stock needs another eligible offer or an honest explanation that we cannot help yet.”
>
> “The restricted scenario demonstrates the gate. It does not expose restricted offer details to the model as usable shopping evidence.”

**If supported by the current UI:** Recommend an offer in baseline, change its eligibility, and attempt the draft action. Show rejection at action time. Otherwise explain that behavior using the relevant evaluation case rather than improvising an unverified sequence.

**Product choice:** Preserve the quality contract when coverage decreases; make the reason actionable for the platform team.

## 3:35–4:15 — Explain the architecture simply

**Show:** The source architecture or data schema, without switching into a long code tour.

**Say:**

> “A shared Node.js core holds the commerce rules. The local preview uses an in-memory adapter; the Firebase Cloud Function path uses a Firestore adapter. Flutter is the intended client source, while this browser preview lets us inspect the experience without the Flutter SDK.”
>
> “Products are Firestore documents. Offers sit under each product, and draft carts are stored separately. That models the relationships this workflow needs; it is not a graph database. We would need more evidence before introducing a larger identity graph or a more complex orchestration stack.”

**Product choice:** Reuse the same rules across environments and choose storage that fits the current access pattern.

## 4:15–5:00 — Show how you would lead the next decision

**Show:** Available quality-evaluation results. Report only executed results, including their denominator and environment. Distinguish proposed pilot metrics from local checks.

**Say:**

> “I would begin with one partner and one location. My first gates are correct matching, no restricted-offer exposure in our tests, supported claims, clear abstention, and reliable action revalidation and retries. Then I would prioritize gaps using observed demand, customer harm, and partner reach.”
>
> “That reflects how I worked on LiteRT: I helped turn stalled priorities into a shared proposal and roadmap across five teams, and found a sample-app path while a core client ramped. Here, a narrow pilot would create evidence and momentum without weakening the contract.”
>
> “The prototype does not establish revenue lift or production reliability. It demonstrates the decisions I would make and the evidence I would require before expanding.”

## Likely follow-up questions

**Why is this a platform, not just a grocery assistant?** The reusable asset is the product/offer contract, evidence, eligibility rules, and action semantics. The dual-pane shopper UI makes that foundation inspectable.

**Why use AI?** A model can interpret varied requests and select bounded tools. The deterministic baseline lets us measure whether that flexibility improves task completion enough to justify additional latency and errors. The catalog and action service remain authoritative.

**Why Flutter and Firebase?** They provide a plausible client and managed-service path for a small team. The Node core separates business rules from those choices. Before a real pilot, compile and test Flutter, validate the Firebase adapter, and establish authentication, user-scoped access, and Firestore rules.

**What is not built or proven?** Real merchant integrations, live price and inventory accuracy, reservations, payment, purchase, fulfillment, production scale, and business impact. Validate model-enabled behavior separately. Do not equate a local preview with a tested cloud deployment.

**What did you personally do?** Explain the customer problem, scope, tradeoffs, action boundary, test scenarios, and implementation decisions you understand. Disclose AI coding assistance. Distinguish your contribution from team delivery on prior launches.

**What would change the roadmap?** Partner evidence might make feed freshness more valuable than new categories. Identity, rights, or duplicate-action defects would pause expansion. If a model does not improve outcomes enough, retain deterministic mode for the bounded use case.
