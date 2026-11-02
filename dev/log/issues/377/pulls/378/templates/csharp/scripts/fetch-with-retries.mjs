/** @type {import('./process-types.js').Fetch} */
const request = fetch;
import { setTimeout as sleep } from 'node:timers/promises';

export function networkReason(error) {
  const cause = error.cause?.code ?? error.cause?.message;
  return `${error.message}${cause ? `: ${cause}` : ''}`;
}

/** Retry only transient failures; callers retain the final HTTP verdict. */
export async function fetchWithRetries(
  url,
  options = {},
  fetchImpl = request,
  { attempts = 4, delayMs = 1000, timeoutMs = 20000 } = {},
) {
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 10)
    throw new Error('Invalid retry attempts');
  for (let attempt = 1; attempt <= attempts; attempt++) {
    let response;
    try {
      response = await fetchImpl(url, {
        ...options,
        signal: options.signal ?? AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      if (attempt === attempts)
        throw new Error(`${url}: ${networkReason(error)} (after ${attempt} attempts)`, {
          cause: error,
        });
    }
    if (
      response &&
      ((response.status !== 429 && response.status < 500) || attempt === attempts)
    )
      return response;
    await response?.body?.cancel?.();
    console.log(`Retrying ${url} (attempt ${attempt + 1} of ${attempts})`);
    await sleep(delayMs * 2 ** (attempt - 1));
  }
}
