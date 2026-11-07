const MAX_BODY = 65536;

// Don't cancel on overflow: local Wrangler can abort the next request (workers-sdk#15709).
export async function readBody(request) {
  if (Number(request.headers.get("Content-Length") || 0) > MAX_BODY) return null;
  if (!request.body) return "";
  const reader = request.body.getReader(), decoder = new TextDecoder();
  let size = 0, text = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return text + decoder.decode();
      size += value.byteLength;
      if (size > MAX_BODY) return null;
      text += decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
}
