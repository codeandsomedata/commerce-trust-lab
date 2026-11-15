# Commerce Trust Lab — product brief

**Portfolio prototype, built with synthetic data.** This is a proposed product direction and a demonstration, not a Microsoft product, a production deployment, or evidence of commercial results. Kite Hill is an example brand; prices, inventory, merchants, and locations in the demo do not represent real merchant integrations. The default experience uses a deterministic tool workflow. Gemini or Ollama tool orchestration requires separate configuration and validation.

## Why this product fits the role

The Microsoft **Principal Product Manager — Commerce AI Platform** role emphasizes shared commerce data, product and offer APIs, catalog quality, responsible partner exposure, and measurable readiness for AI experiences. Commerce Trust Lab makes those decisions visible: which product an offer represents, which offers can be exposed, whether their evidence is fresh enough, and when the experience should decline to answer. [Microsoft role page](https://apply.careers.microsoft.com/careers/job/1970393557051399-principal-product-manager-commerce-ai-platform-united-states-california-mountain-view), [readable description mirror](https://www.olive.jobs/job/pst_6222488ea116a0a5).

The role title matches the opportunity being discussed; the supplied job number **200064968 has not been independently confirmed** against the accessible posting.

## Goal → trusted evidence and a useful next action

Help a shopper find an eligible, attributable local grocery offer and prepare a draft cart—or clearly explain what evidence is missing. Make the same contract reusable by partner experiences, so each partner does not have to reconstruct product identity, merchant permissions, freshness, and stock rules.

The first product question is: **What must be true before an AI experience can recommend an offer and act on it?**

## Pain point → a fluent answer can still be wrong

- A shopper asks for a particular yogurt below a budget in Mountain View; an offer for another product or location does not satisfy that request.
- The lowest listed price is old enough that availability and price can no longer be trusted.
- A merchant's data exists in the catalog, but the merchant has not permitted its use in this experience.
- An offer becomes unavailable after it was recommended, before the shopper acts.
- A partner receives an empty answer without knowing whether the cause is stale data, missing attributes, a rights restriction, or absent category coverage.

These are distinct problems. Treating them all as a prompt-quality issue conceals the work the platform needs to do.

## Priorities → trust, useful coverage, then breadth

1. **Correct identity and eligibility.** Match product, budget, and location. Apply rights, freshness, and stock filters before any offer reaches a model as usable evidence.
2. **Explainable answers and failures.** Show sources, timestamps, rejection reasons, clarification needs, and tool activity. Avoid claiming current real-world prices from synthetic fixtures.
3. **A reusable contract.** Expose documented product and offer data with consistent eligibility behavior, rather than embedding all rules in the chat surface.
4. **A bounded, reliable action.** Revalidate the offer when the shopper explicitly chooses **Prepare demo cart**. Create a draft only, with retries that do not create duplicate drafts.
5. **Observable catalog gaps.** Distinguish stale, restricted, and unavailable offers from absent coverage. Use those signals to choose the next investment.

For non-blocking improvements, prioritize **observed customer demand × severity of the gap × partner reach**, then weigh delivery effort and confidence in the evidence. Rights violations and identity errors are release gates, not defects that high request volume can justify.

## Solution → a dual-pane grocery agent demo

The main request is **“Get me Kite Hill yogurt under $6 in Mountain View.”** One pane shows the shopper conversation and the explicit draft-cart action. The other makes the platform evidence inspectable: product and offer data, eligibility decisions, and the tool trace. Baseline, stale, restricted, and out-of-stock scenarios show how the same request behaves when the evidence changes.

An offer that is stale, restricted, or out of stock cannot become eligible because a model recommends it. If an eligible alternative remains, the system can select that alternative. If no qualifying offer remains, it should abstain and explain the gap without exposing restricted offer content as recommendation evidence.

**Prepare demo cart** rechecks the chosen offer and creates a separate draft-cart record. It does not reserve inventory, initiate payment, or buy anything. Repeating the same action with the same idempotency key returns the same draft rather than creating another one. A stale recommendation cannot bypass current action-time eligibility checks.

### Implementation and current validation boundary

- **Shared Node.js core:** one implementation of lookup, eligibility, and draft-cart rules is reused by the local in-memory preview and the Firebase Cloud Function adapter.
- **Firebase/Firestore:** products are documents in `products`; their offers live in `products/{id}/offers`; draft carts are stored separately. This is a document model of relationships, not a graph database.
- **Flutter:** the repository includes a compiled Flutter web client. Static analysis, eight tests and the release build pass. A separate lightweight web preview exercises the same API.
- **Agent behavior:** deterministic bounded tools are the default. Separately configured Gemini or Ollama orchestration can choose tools, while rights, freshness, stock, and action validation remain authoritative code. No orchestration framework is necessary for this bounded workflow.

Local Firebase Hosting → Cloud Function → Firestore lookup, draft creation and idempotent retry have been verified. The backend has 48 passing policy/contract tests and 12 passing synthetic evaluation scenarios. These checks do not establish a deployed cloud service, production security or live-model reliability; real Gemini validation awaits a configured API key.

### Deliberate tradeoffs

Firebase and Flutter were selected for prototype speed and a visible end-to-end flow. For a Microsoft interview, explain that the API, eligibility contract and evaluation approach are portable; an Azure implementation could use Azure Functions and a suitable document store. The portfolio demonstrates product decisions and trusted actions rather than claiming that one cloud stack is the only design.

| Decision | Benefit | Cost and next evidence needed |
|---|---|---|
| Start with one grocery request and location | Makes product, budget, location, and inventory constraints easy to evaluate | Does not establish broader grocery coverage or multi-location behavior |
| Reject stale offers even when cheaper | Reduces unsupported shopping recommendations | Lowers answer coverage; measure whether feed-refresh investment restores useful coverage |
| Revalidate at draft creation | Prevents acting on an offer that has become ineligible | Adds a second check and possible user disappointment; explain changes and support an eligible alternative |
| Create drafts, not purchases | Demonstrates an explicit action with bounded consequences | Does not prove checkout, reservation, payment, or fulfillment integration |
| Use explicit rights, freshness, and stock checks | Gives every consumer a consistent exposure contract | Requires policy ownership, revocation handling, and connector reliability before production |
| Ship a deterministic baseline first | Makes the demo reproducible without API keys or model downloads | Does not prove LLM reliability; run the same evaluation set against live-model mode separately |
| Share a Node core across preview and Firebase adapters | Keeps business rules consistent while allowing a quick local demo | Adapter integration, deployment, and security still require separate verification |
| Use Firestore documents and subcollections | Fits the narrow product-to-offer lookup and draft workflow | Does not provide a graph query engine or prove large-scale identity clustering |

## GTM → one partner, one category, explicit gates

This is a proposed rollout, not an executed launch. Start with one internal or design-partner shopping experience and a narrow set of high-value intents. Provide a quickstart, API schema, example queries, eligibility semantics, and a known-limitations page. Review failed queries with the partner before adding broad catalog coverage.

Progress through **offline evaluation → limited pilot → production consideration**. Before a pilot, require no rights leaks in the evaluation set, correct product/location handling, supported factual claims, clear abstention, action-time revalidation, idempotent retries, and stable API behavior. Production readiness also needs real merchant agreements, reliable refresh/revocation, authentication and user-scoped authorization, Firestore security rules, service objectives, operational ownership, and scale testing. The prototype does not establish those capabilities.

### Proposed 30 / 60 / 90-day roadmap

| Window | Product work | Decision / exit evidence |
|---|---|---|
| First 30 days | Interview shoppers, merchants, and partner developers; agree the local-grocery use case; establish data/API semantics and action boundaries; validate Flutter and Firebase paths | An agreed quality contract, a verified client/service integration, and a baseline showing where answers or actions fail |
| Days 31–60 | Connect one authorized feed, run a limited partner pilot, instrument gap reasons and draft-cart completion | Evidence that fresh, eligible coverage improves useful answers and draft completion without relaxing trust gates |
| Days 61–90 | Address the largest validated gaps; evaluate a second partner or location; test reliability, revocation, and operational readiness | An evidence-based expansion decision; evaluate checkout separately only if customer value and partner readiness justify it |

## Metrics → measure the foundation and its usefulness

These are proposed metric definitions. Report actual test counts and denominators when measured; do not present targets as achieved outcomes.

| Metric | Definition |
|---|---|
| Supported-answer rate | Answers whose factual claims are supported by eligible evidence / evaluated factual answers |
| Eligible-answer coverage | In-scope evaluated intents with a correct eligible offer / in-scope evaluated intents |
| Freshness compliance | Surfaced offers within the declared policy / surfaced offers |
| Rights exposure defects | Restricted offers exposed to a consumer or model as usable evidence; target zero in the evaluation set |
| Match accuracy | Correct product and location selections within the requested budget / evaluated selections |
| Action eligibility | Draft actions that pass current offer validation / successful draft actions |
| Retry integrity | Repeated requests with the same idempotency key that return the same draft / evaluated repeated requests |
| Gap mix | Requests blocked by missing coverage, stale evidence, restrictions, or stock; preserve reason counts |
| API latency and errors | Measured median/p95 and error rate, labeled with environment, sample size, and whether a model was used |
| Pilot adoption, later | Time to first successful integration, repeat partner usage, useful-answer rate, and eligible draft completion observed with real users |

Small fixture tests demonstrate expected behavior; they do not estimate production error rates. Revenue, conversion, and retention remain hypotheses until a real pilot can measure them.

## My contribution and transferable experience

Suggested interview language, to adapt to your exact ownership:

> “My experience spans merchant and customer workflows through FBA and Local Services Ads, and developer infrastructure through LiteRT. For this prototype, I chose to connect those perspectives: a platform that respects merchant constraints, gives customers grounded local-shopping answers, and gives developers a predictable contract for taking action. I scoped the problem, selected the quality gates, made the coverage-versus-trust tradeoffs explicit, and limited the first action to a revalidated draft cart.”

Use your LiteRT experience as evidence of how you work: forming a shared proposal when priorities were stalled, aligning five teams, agreeing client priorities and a roadmap, and finding a sample-app path when a core client's ramp delayed the launch checkpoint. Explain which decisions you personally drove and which engineering outcomes the team delivered.

Be transparent that this portfolio prototype was developed with AI coding assistance. Your interview contribution is the problem selection, product judgment, evaluation criteria, and understanding of the implementation—not an unsupported claim that you independently wrote every line.
