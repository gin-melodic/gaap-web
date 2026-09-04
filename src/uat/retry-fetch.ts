const RETRYABLE_CAUSE_CODES = new Set([
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_SOCKET',
  'ECONNREFUSED',
  'ECONNRESET',
  'EPIPE',
]);

function isTransportError(error: unknown): boolean {
  if (!(error instanceof TypeError) || error.message !== 'fetch failed') return false;
  const code = (error as { cause?: { code?: string } }).cause?.code;
  return !code || RETRYABLE_CAUSE_CODES.has(code);
}

export function installUatFetch(baseUrl: string, maxRetries = 4): void {
  const nativeFetch = globalThis.fetch.bind(globalThis);
  const resolveUrl = (input: RequestInfo | URL) =>
    typeof input === 'string' && input.startsWith('/') ? `${baseUrl}${input}` : input;
  globalThis.fetch = async (input, init) => {
    for (let attemptNo = 0; ; attemptNo += 1) {
      try {
        return await nativeFetch(resolveUrl(input), init);
      } catch (error) {
        // Local Docker Desktop port-forwarding intermittently freezes for tens of seconds;
        // a connect-level failure means the request never reached Caddy, so retry is safe.
        if (!isTransportError(error) || attemptNo >= maxRetries) throw error;
        await new Promise((resolve) => setTimeout(resolve, 300 * (attemptNo + 1)));
      }
    }
  };
}
