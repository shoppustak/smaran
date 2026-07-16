import { logger } from "./logger";

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: any) => boolean;
  onRetry?: (error: any, attempt: number, nextDelayMs: number) => void;
}

export function isRetryableError(error: any): boolean {
  if (error && typeof error.status === "number") {
    const status = error.status;
    return status === 408 || status === 429 || (status >= 500 && status <= 599);
  }

  if (error instanceof Error) {
    const code = (error as any).code;
    const msg = error.message.toLowerCase();
    if (
      code === "ECONNRESET" ||
      code === "ECONNREFUSED" ||
      code === "ETIMEDOUT" ||
      code === "EADDRINUSE" ||
      code === "ENOTFOUND" ||
      code === "EPIPE" ||
      msg.includes("fetch failed") ||
      msg.includes("timeout") ||
      msg.includes("network error")
    ) {
      return true;
    }
  }

  return false;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 1000;
  const maxDelayMs = options.maxDelayMs ?? 10000;
  const shouldRetry = options.shouldRetry ?? isRetryableError;

  let attempt = 0;
  while (true) {
    attempt++;
    try {
      return await fn();
    } catch (error) {
      if (attempt >= maxAttempts || !shouldRetry(error)) {
        throw error;
      }

      const exponentialDelay = baseDelayMs * Math.pow(2, attempt - 1);
      const jitter = (Math.random() * 0.5 - 0.25) * exponentialDelay;
      const rawDelay = exponentialDelay + jitter;
      const nextDelayMs = Math.min(Math.max(0, rawDelay), maxDelayMs);

      if (options.onRetry) {
        options.onRetry(error, attempt, nextDelayMs);
      } else {
        logger.warn(
          { error, attempt, nextDelayMs },
          `Transient error encountered. Retrying in ${nextDelayMs.toFixed(0)}ms...`
        );
      }

      await new Promise((resolve) => setTimeout(resolve, nextDelayMs));
    }
  }
}

export async function retryFetch(
  url: string | URL,
  options?: RequestInit,
  retryOptions: RetryOptions = {}
): Promise<Response> {
  return withRetry(async () => {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorObj = {
        status: response.status,
        statusText: response.statusText,
        message: `HTTP error ${response.status}: ${response.statusText}`,
      };
      if (isRetryableError(errorObj)) {
        throw errorObj;
      }
    }
    return response;
  }, retryOptions);
}
