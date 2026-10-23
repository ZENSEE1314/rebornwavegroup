// Express 4 ignores a promise that an async route handler rejects, so a failed database call left the request hanging until the browser gave up
// ("Failed to fetch" in the POS). Every handler's rejection now goes to the error handler like a thrown error does. Import this before any route is added.
// @ts-expect-error express has no type declarations for its internals
import Layer from "express/lib/router/layer.js";

const ERROR_HANDLER_ARITY = 4;

const original = Layer.prototype.handle_request;
Layer.prototype.handle_request = function patchedHandleRequest(this: any, req: unknown, res: unknown, next: (error?: unknown) => void) {
  const handler = this.handle;
  if (typeof handler !== "function" || handler.length > ERROR_HANDLER_ARITY - 1) return original.call(this, req, res, next);
  try {
    const result = handler(req, res, next);
    if (result && typeof result.catch === "function") result.catch(next);
  } catch (error) {
    next(error);
  }
};
