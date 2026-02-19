/**
 * fetchWithRetry -- multi-instance failover for TIDAL API proxy calls.
 *
 * Picks a random starting instance, round-robins on failure.
 * Handles 429 (rate limit), 401+11002 (auth), 5xx, and network errors.
 */

import {
  getInstances,
  randomInstanceIndex,
  type InstanceType,
} from "./instances";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface FetchOptions {
  type?: InstanceType;
  signal?: AbortSignal;
}

export async function fetchWithRetry(
  relativePath: string,
  options: FetchOptions = {}
): Promise<Response> {
  const type = options.type ?? "api";
  const instances = getInstances(type);

  if (instances.length === 0) {
    throw new Error(`No API instances configured for type: ${type}`);
  }

  const maxAttempts = instances.length * 2;
  let lastError: Error | null = null;
  let instanceIndex = randomInstanceIndex(instances);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const baseUrl = instances[instanceIndex % instances.length];
    const url = baseUrl.endsWith("/")
      ? `${baseUrl}${relativePath.substring(1)}`
      : `${baseUrl}${relativePath}`;

    try {
      const response = await fetch(url, { signal: options.signal });

      if (response.status === 429) {
        console.warn(`[API] Rate limit on ${baseUrl}, trying next...`);
        instanceIndex++;
        await delay(500);
        continue;
      }

      if (response.ok) {
        return response;
      }

      if (response.status === 401) {
        try {
          const errorData = await response.clone().json();
          if (errorData?.subStatus === 11002) {
            console.warn(`[API] Auth failed on ${baseUrl}, trying next...`);
            instanceIndex++;
            continue;
          }
        } catch {
          // JSON parse failed, treat as regular error
        }
      }

      if (response.status >= 500) {
        console.warn(
          `[API] Server error ${response.status} on ${baseUrl}, trying next...`
        );
        instanceIndex++;
        continue;
      }

      lastError = new Error(`Request failed with status ${response.status}`);
      instanceIndex++;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw error;
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(
        `[API] Network error on ${baseUrl}: ${lastError.message}, trying next...`
      );
      instanceIndex++;
      await delay(200);
    }
  }

  throw lastError ?? new Error(`All instances failed for: ${relativePath}`);
}
