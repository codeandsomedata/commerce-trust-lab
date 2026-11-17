# Product scope and tradeoffs

Commerce Trust Lab demonstrates a narrow commerce workflow: find one eligible grocery offer, show the supporting evidence, and prepare a draft only after an explicit user action. The catalog and merchant records are synthetic. This document separates implemented product decisions from possible next steps.

## Goal

Let a shopper ask for a supported yogurt pickup item within a USD budget and city, receive a grounded offer, and take one bounded next action. Let a developer inspect why the system answered, abstained, or declined to act.

The reusable foundation is the product/offer API, eligibility policy, and draft-action contract. The Flutter and browser clients consume the same service.

## Customer pain points

- The lowest listed price may be stale, unavailable, in another city, or for another product variant.
- A merchant's data may exist in storage without permission to display it in an AI experience.
- An answer can become invalid before the customer acts.
- A failed request is difficult to improve if the platform cannot distinguish missing coverage from permission, freshness, or stock problems.
- A network retry must not create multiple drafts for the same approved action.

## Priorities

1. Preserve supported customer constraints instead of silently relaxing them.
2. Require permitted, fresh, attributable evidence before recommending an offer.
3. Separate a recommendation from an explicit action request.
4. Revalidate at action time and make retries predictable.
5. Expose a completed execution trace and repeatable failure cases.

## Implemented solution

The example request is **“Get me Kite Hill yogurt under $6 in Mountain View.”** The service parses its supported constraints, reads the catalog, applies eligibility rules, and selects the lowest-priced eligible offer. If the selected merchant permits cart preparation, it stores a ten-minute proposal. **Prepare demo cart** consumes that proposal after revalidation and creates a draft; it does not purchase or reserve inventory.

The right-hand pane displays the tool call, eligible catalog evidence, aggregate policy outcomes, answer-composition step, and draft action. On small Flutter screens, the two panes become tabs. Events arrive with the completed response rather than as a live stream.

Gemini is the default model selection in the clients and API. After a supported request is submitted, two server-side model calls perform structured extraction and eligible-evidence selection. Both outputs must agree with the independent parser and deterministic offer ranking. Factual answer text is rendered by the application in all modes. Initial page load does not call a model; missing credentials remain visible rather than triggering a silent fallback. Explicit Offline Demo and optional local Ollama modes support different run environments without changing the commerce policy.

Products and offers are separate Firestore document types. The local server can use in-memory fixtures or the Firestore adapter; a Firebase HTTP function uses the same core. This is a document model, not a graph database. See [technical design](../README.md#technical-design) for the exact contracts.

## Deliberate tradeoffs

| Decision | Benefit | Limitation |
|---|---|---|
| Gemini first, explicit offline alternative | Makes the model/tool boundary part of the main experience | Requires a server-side key and provider availability for live runs |
| One category, one item, two cities | Makes intent preservation and failures inspectable | Does not establish broad shopping coverage |
| Strict parser even in model mode | Prevents unsupported constraints from becoming actions | Rejects many natural-language requests an unconstrained model could interpret |
| Filter first, rank by price second | Avoids promoting invalid evidence because it is cheap | Reduces apparent answer coverage |
| Validate the model's selection against deterministic ranking | Makes selection behavior testable | The model is not an independent recommender |
| Draft instead of checkout | Provides a real persisted action with bounded consequences | Does not demonstrate merchant ordering, payment, or inventory reservation |
| Frozen catalog time | Keeps failure scenarios reproducible | Does not prove live freshness; proposal expiry uses a separate real clock |
| Shared core with two storage adapters | Keeps policy and action validation consistent | Emulator and local tests do not establish production service quality |
| Return the completed trace | Makes the actual request inspectable without simulated progress | No streaming tool events or model-token streaming |

## Adoption path — proposed, not executed

The next useful pilot would pair one authorized grocery feed with one consuming experience. Agree on product identity, permissions, observation times, supported actions, and failure semantics before broadening categories.

| Stage | Work | Evidence needed to proceed |
|---|---|---|
| Baseline | Run synthetic cases and local integrations | Correct matching, restricted-data exclusion, abstention, and draft retry behavior |
| Limited pilot | Replace fixtures with an authorized feed and user-scoped access; use a real clock | Useful eligible coverage, reliable refresh/revocation, and controlled action failures |
| Expansion decision | Add another location, category, or consumer based on observed demand | A measured benefit large enough to justify operational and integration cost |

Checkout is a separate product decision. It would require partner support, current readiness checks, an inventory/order protocol, and payment and fulfillment handling.

## Measurement

**Implemented:** each search reports candidate, eligible, and rejected offer counts plus aggregate rejection reasons. The evaluation script runs twelve synthetic cases. Tests exercise policy, model-protocol checks, and draft correctness. The [validation record](validation.md) lists actual executed checks.

**Proposed for a real pilot:** supported-answer rate, eligible-answer coverage, product/location match accuracy, freshness compliance, rights exposure defects, action rejection reasons, same-key retry integrity, integration time, and measured latency/error distributions. Report denominators, environment, and model mode for each result.

A small fixture suite is not a production accuracy estimate. No conversion, retention, revenue, merchant adoption, or production SLO outcome is claimed. Prioritize gaps using observed demand, customer impact, partner reach, effort, and confidence; identity and rights failures remain release gates.
