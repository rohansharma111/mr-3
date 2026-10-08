import { randomUUID } from "crypto";

export function getRequestId(request: Request) {
  const supplied = request.headers.get("x-request-id")?.trim();
  return supplied && /^[A-Za-z0-9._:-]{1,128}$/.test(supplied) ? supplied : randomUUID();
}

export function requestIdHeaders(requestId: string) {
  return { "X-Request-ID": requestId };
}
