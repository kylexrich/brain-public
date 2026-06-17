---
title: "Backend Error Handling"
description: "error translation, proportional catch/rethrow behavior, and stable HTTP error responses."
order: 3
---

## Error Handling And Error Translation
**Note:** Error handling should be proportional to risk. Default to letting unexpected errors propagate to the top-level handler; do not wrap every call in try/catch. At trust boundaries and long-running consumers/loops, it is acceptable to catch only to translate to internal error types and/or add actionable context (identifiers, operation name, classification), then rethrow; do not add fallback behavior for impossible states.

* **[STRICT]** Translate external/library errors to internal error types defined in `app/src/errors/` or
  feature-specific error folders. Do not let Prisma errors, Stripe errors, or other third-party exception
  types propagate through your service layer.
  * **Example:** Catch `PrismaClientKnownRequestError` in the repository and throw a domain-specific `NotFoundError` or `ConflictError`.
* **[STRICT]** At HTTP boundaries, translate internal errors to stable API error responses. Do not leak internal exception types, stack traces, or error messages to clients.
  * **Example:** Map `NotFoundError` to a `404` with a stable error code; do not expose internal error details.
* **[STRICT]** When catching errors, either handle them meaningfully or rethrow as an internal error type with added context. Do not write empty catch blocks or catch-and-ignore.
  * **Example:** `catch (err) { throw new PaymentFailedError("Charge declined", { cause: err, orderId }); }`
* **[GUIDELINE]** Do not wrap every function call in try/catch. Let unexpected errors propagate to the top-level error handler. Only catch errors when you can do something useful: retry, fallback, translate to an internal error type, or add context.
  * **Example:** A service calling a repository does not need try/catch if the repository already throws internal error types that should propagate up.
* **[GUIDELINE]** Use exceptions for exceptional failures (things that should not happen in normal operation). For expected business outcomes like "user not found," either return `null`/`undefined` or throw a well-defined internal error type; be consistent within each module.
  * **Example:** `findUserById()` returns `null` when user does not exist; `getUserById()` throws `NotFoundError` when user must exist.
