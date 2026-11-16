# Five-minute product walkthrough

## Prepare

Start the local server using the [README](../README.md). For persisted local data, start and seed the Firebase emulator and run the server with the Firestore adapter. Open the browser preview or the built Flutter app.

Use **Demo** mode for a reproducible walkthrough. It makes no model calls. Optional Gemini/Ollama modes require separate configuration and validation. All displayed merchant data, inventory, prices, and dietary attributes are synthetic, and the catalog observation clock is frozen.

## 0:00–0:45 — State the task

> “This agent finds one eligible grocery pickup offer and prepares a draft after approval. The second pane shows the actual parameters, evidence, and checks behind the result. It does not purchase or reserve stock.”

Select **Fresh & available** in the browser or **Fresh offers** in Flutter, then submit:

> Get me Kite Hill yogurt under $6 in Mountain View

Explain the three central constraints: product, budget, and pickup city. The supported parser also accepts covered flavor, size, and dietary tags, but it does not support arbitrary grocery or nutrition requests.

## 0:45–1:45 — Inspect the answer and evidence

Show the eligible offer, attribution, and observation timestamp. In the trace, open the `search_catalog` arguments, returned evidence, and policy checks.

> “The service first finds matching products, then rejects offers that fail permissions, freshness, stock, pickup, city, budget, currency, or attribution. It sorts the remaining offers by price. A lower price cannot override a failed eligibility check.”

Show aggregate rejection counts. Clarify that excluded row identities and prices are absent from the API result. Several reasons may apply to one offer, so reason counts need not equal the number of rejected offers.

## 1:45–2:30 — Prepare a draft

Click **Prepare demo cart** and show the returned draft.

> “The search produced a proposal, not a cart. This separate request rechecks the current product and offer. The result is a one-item draft with no payment, order, or stock hold.”

Explain retry semantics: the client preserves its retry key, and the server returns the same draft for that proposal/key. A different key for a consumed proposal is rejected. Returning an earlier draft does not claim that current stock remains available.

## 2:30–3:30 — Demonstrate failures

Repeat the same request with each scenario:

| Browser / Flutter scenario | Expected result |
|---|---|
| **Stale offer** / **Stale price** | Every offer receives an old fixture timestamp; no eligible recommendation or cart action |
| **Merchant restriction** / **Merchant opt-out** | Display permission is removed from every offer; no restricted row details are exposed |
| **Out of stock** (both clients) | Every offer becomes unavailable; no eligible recommendation or cart action |

The scenarios are non-persistent overlays, not changes sent to merchants. Try an unsupported request such as organic yogurt; the agent asks for clarification rather than silently dropping the constraint.

> “Different failures require different fixes. Stale data needs a better refresh path. Permission needs an authorized source. Unavailable stock needs a qualifying alternative or an honest abstention.”

## 3:30–4:20 — Explain the model boundary

In Demo mode, show the trace label identifying the deterministic renderer. Do not call it a live LLM request.

> “In an optional live mode, the first model request produces a structured search tool call. The service requires those constraints to match its independent parser. The second model request sees only eligible evidence and selects an offer ID. The service checks that selection and renders factual answer text from the record.”

If live mode has been configured and independently verified, repeat one supported request and inspect its evidence-selection prompt. Model failure is surfaced; the service does not silently substitute Demo mode. There is no open-ended tool loop or model-accessible purchase tool.

## 4:20–5:00 — Connect the UI to the system

Show the architecture diagram in the README.

> “The Flutter and browser clients share a Node service. It can use in-memory fixtures or Firestore through the same adapter interface. Firestore stores product documents, offer subcollections, proposals, and drafts. New draft creation is transactional in the Firestore adapter.”

Finish with the distinction between what is implemented and what remains: current checks are repeatable synthetic and local integration evidence. Real merchant feeds, current-time freshness, authenticated users/partners, cleanup, scale testing, and checkout are separate work. Use the dated [validation record](validation.md) for actual results rather than treating the walkthrough as production evidence.
