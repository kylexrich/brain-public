---
title: "Backend Observability"
description: "structured logging, redaction, stable keys, actionable error context, metrics, and tracing."
order: 8
---

## Logging And Observability
* **[STRICT]** Must log at boundaries and key decisions using structured, stable keys; logs must be searchable and consistent across services. Must redact secrets, credentials, tokens, and sensitive personal data.
  * **Example:** Log `requestId`, `userId`, and `errorCategory`; never log `Authorization` headers.
* **[STRICT]** Logs must be actionable: include correlation identifiers, component names, and error categories; avoid vague messages.
  * **Example:** Prefer "DB timeout on GetOrders (warehouseId=..., requestId=...)" over "Something went wrong."
* **[STRICT]** Must keep each log line within 120 characters; wrap only to respect the limit.
* **[GUIDELINE]** Prefer metrics and tracing for performance and reliability insights rather than adding verbose logs everywhere; prefer consistent error taxonomy and log levels across services to support unified alerting.
