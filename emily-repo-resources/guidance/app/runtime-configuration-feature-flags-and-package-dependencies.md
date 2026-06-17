---
title: "Backend Configuration And Dependencies"
description: "validated runtime configuration, feature flags, dependency reuse, dependency version discipline, adapter boundaries, and dependency injection."
order: 11
---

## Configuration And Feature Flags
* **[STRICT]** Must keep configuration outside code and inject it via environment/config files/secret stores appropriate to the platform; must never hardcode environment-specific values (hosts, credentials, feature flags) in source.
  * **Example:** Read DB URL from `DATABASE_URL`, not a repository constant.
* **[STRICT]** Must validate configuration at startup and fail fast and clearly when required settings are missing or invalid; errors must not leak secrets.
  * **Example:** Refuse to start if `JWT_SIGNING_KEY` is missing in production.
* **[STRICT]** Must not branch behavior on environment in scattered places; must centralize environment-specific choices behind configuration flags and adapters.
  * **Example:** Select S3 vs local storage via a `StorageProvider` chosen in composition root, not via `if (NODE_ENV === "production")` throughout.
* **[STRICT]** Feature flags must be safe: default behavior must be well-defined; flag evaluation must not create inconsistent partial updates within a single request/transaction. Evaluate a flag once per request and pass the decision downward.
  * **Example:** Compute `useNewPricingEngine` once and thread it through, rather than re-checking mid-flight.
* **[GUIDELINE]** Prefer typed, schema-validated configuration with explicit documentation of each setting, including units and allowed ranges; avoid over-parameterization.
  * **Example:** Validate `REQUEST_TIMEOUT_MS` is an integer within an allowed range.
* **[GUIDELINE]** Prefer feature flags for incremental rollout of risky changes; flags must be observable, have owners, and include an expiration/removal condition.
  * **Example:** `FEATURE_NEW_CHECKOUT` with metrics and `// Remove after 100% rollout and 2 weeks stable.`
* **[GUIDELINE]** Prefer separating configuration (environment-specific constants) from domain policy (business rules); business rules should live in versioned code or explicitly versioned policy stores with audit trails.

## Dependencies And Third-Party Integrations
* **[STRICT]** Before adding new helpers or utilities, must check `app/package.json` to ensure no existing package covers the use case; must use established libraries for standard problems instead of rolling custom solutions.
* **[STRICT]** Must not introduce a new third-party dependency for trivial functionality if the standard library or existing dependencies suffice; must not rely on undocumented or unstable internals of dependencies.
* **[STRICT]** Must pin and manage dependency versions predictably (lockfiles, explicit ranges) and avoid dependency churn that destabilizes builds.
* **[STRICT]** Must encapsulate external service clients (payment processors, telephony providers, AI services, CRMs) behind adapter boundaries; their types/exceptions must not leak into domain APIs. Utility libraries such as date parsing, string manipulation, and validation do not require wrapper abstractions.
  * **Example:** Wrap Stripe/Retell/OpenAI clients in adapters that expose domain types; use date-fns or zod directly without wrapping.
* **[STRICT]** Must inject dependencies explicitly for services and components with external dependencies; object creation for these must occur at a composition root. Must not hide service dependencies behind global singletons or service locators. Pure utility functions may create internal helper objects (formatters, parsers) without injection.
  * **Example:** Inject `PaymentGateway` and `UserRepository` into services; a `formatCurrency()` utility can internally use `Intl.NumberFormat`.
* **[GUIDELINE]** Prefer a "dependency diet": reduce transitive dependency surface, especially for security-critical or runtime-critical components; prefer small, well-maintained libraries with clear licensing.
* **[GUIDELINE]** Prefer writing adapters around unstable APIs; keep integration code thin and isolate retries/backoff, rate limits, pagination, and error normalization so provider changes are localized to the adapter.
