/**
 * HTTP helper MURNI — tanpa dependensi `vscode`, aman di-unit-test.
 */

export const DEFAULT_TIMEOUT_MS = 120_000;

export class HttpError extends Error {
  readonly status: number;
  constructor(status: number, body: string) {
    super(`HTTP ${status}: ${body.slice(0, 300)}`);
    this.name = "HttpError";
    this.status = status;
  }
}

/** Buang trailing slash agar `${base}/api/...` tidak dobel slash. */
export function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export interface RequestOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
}

/** POST JSON + timeout. Error jaringan/timeout dibungkus pesan ramah. */
export async function postJson<T>(
  url: string,
  body: unknown,
  options?: RequestOptions
): Promise<T> {
  return requestJson<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify(body),
    timeoutMs: options?.timeoutMs
  });
}

/** GET JSON + timeout. Dipakai untuk daftar model Ollama (/api/tags). */
export async function getJson<T>(url: string, options?: RequestOptions): Promise<T> {
  return requestJson<T>(url, {
    method: "GET",
    headers: { ...options?.headers },
    timeoutMs: options?.timeoutMs
  });
}

interface InternalOptions {
  method: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}

async function requestJson<T>(url: string, options: InternalOptions): Promise<T> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: options.method,
      headers: options.headers,
      body: options.body,
      signal: controller.signal
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new HttpError(res.status, text);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof HttpError) {
      throw err;
    }
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(
        `Timeout: server tidak merespons dalam ${Math.round(timeoutMs / 1000)} detik (${url}).`
      );
    }
    throw new Error(
      `Tidak bisa terhubung ke ${url}: ${err instanceof Error ? err.message : String(err)}`
    );
  } finally {
    clearTimeout(timer);
  }
}
