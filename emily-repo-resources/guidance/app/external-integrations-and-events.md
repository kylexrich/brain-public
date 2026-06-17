---
title: "Backend Integrations And Events"
description: "external provider translation, event/message compatibility, transactional outbox/inbox, workflow/process managers, and domain-event emission rules."
order: 4
---

## External Integration Boundaries
* **[STRICT]** When integrating with external APIs (Stripe, Retell, OpenAI, etc.), translate their types and terminology at the adapter boundary. Do not let external API shapes leak into your service layer.
  * **Example:** Map Stripe's `payment_intent` fields to your internal `Payment` type in the adapter, not in business logic.
* **[GUIDELINE]** Use consistent terminology within the codebase. If an external system uses different names for the same concept, translate once at the boundary and use your internal term everywhere else.
  * **Example:** If Retell calls it `call_id` but you call it `retellCallId` internally, map it in the adapter.

## Events, Messaging, And Workflow Reliability
* **[STRICT]** Message handling must be idempotent and safe under at-least-once delivery; every consumer must tolerate duplicates and reordering unless the broker guarantees stronger semantics.
  * **Example:** Use a processed-message table keyed by `(messageId, consumer)`.
* **[STRICT]** Must version event/message schemas and maintain backward compatibility for consumers; must not
  remove or change meaning of fields without a version bump and migration plan. Internal changes still need
  safe migration or compatibility when any consumer exists.
  * **Example:** Add `discountCode` as optional; do not rename `orderId` to `id` without versioning.
* **[GUIDELINE]** Prefer transactional outbox/inbox patterns when persistence and messaging must stay consistent; avoid best-effort publishing that can lose events unless explicitly acceptable.
  * **Example:** Write `OrderPlaced` to an outbox table in the same DB transaction as the order update.
* **[GUIDELINE]** Prefer explicit workflow/process managers (sagas) for long-running, multi-step business processes; keep compensation logic explicit and testable.
  * **Example:** A `FulfillmentSaga` reacts to `PaymentCaptured` and `InventoryReserved` to drive shipment creation.
* **[GUIDELINE]** Prefer emitting domain events for significant business occurrences that other parts of the system react to; avoid emitting events for trivial internal field updates.
