import { 
  AIProvider, 
  GenerateOptions, 
  GenerateResponse, 
  ProviderConfig,
  createProviderError 
} from "./types.ts";

export abstract class BaseProvider implements AIProvider {
  abstract readonly name: string;
  abstract readonly supportedModels: string[];
  
  protected config: ProviderConfig;
  protected defaultTimeout = 30000;
  protected defaultMaxTokens = 1024;

  constructor(config: ProviderConfig = {}) {
    this.config = {
      defaultTimeout: this.defaultTimeout,
      defaultMaxTokens: this.defaultMaxTokens,
      ...config,
    };
  }

  abstract generate(options: GenerateOptions): Promise<GenerateResponse>;

  supportsModel(model: string): boolean {
    return this.supportedModels.some(
      (m) => m === model || model.startsWith(m.replace("*", ""))
    );
  }

  protected async fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeoutMs: number
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw createProviderError(
          this.name,
          `Request timed out after ${timeoutMs}ms`,
          "TIMEOUT"
        );
      }
      throw createProviderError(
        this.name,
        error instanceof Error ? error.message : "Network error",
        "NETWORK_ERROR"
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  protected handleErrorResponse(status: number, body: string): never {
    if (status === 401 || status === 403) {
      throw createProviderError(this.name, "Authentication failed", "AUTH_ERROR", status);
    }
    if (status === 429) {
      throw createProviderError(this.name, "Rate limit exceeded", "RATE_LIMIT", status);
    }
    if (status === 400 && body.includes("token")) {
      throw createProviderError(this.name, "Token limit exceeded", "TOKEN_LIMIT", status);
    }
    if (status === 404) {
      throw createProviderError(this.name, "Model not found", "MODEL_NOT_FOUND", status);
    }
    throw createProviderError(this.name, `API error: ${body}`, "UNKNOWN", status);
  }
}
