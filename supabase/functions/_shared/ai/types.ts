// Common types for AI provider abstraction

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GenerateOptions {
  messages: Message[];
  model: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

export interface GenerateResponse {
  content: string;
  model: string;
  provider: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: "stop" | "length" | "error";
  latencyMs: number;
}

export interface ProviderError extends Error {
  provider: string;
  code: "TIMEOUT" | "RATE_LIMIT" | "AUTH_ERROR" | "TOKEN_LIMIT" | "MODEL_NOT_FOUND" | "NETWORK_ERROR" | "UNKNOWN";
  statusCode?: number;
  retryable: boolean;
}

export interface AIProvider {
  readonly name: string;
  readonly supportedModels: string[];
  
  generate(options: GenerateOptions): Promise<GenerateResponse>;
  supportsModel(model: string): boolean;
}

export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  defaultTimeout?: number;
  defaultMaxTokens?: number;
}

// Helper to create provider errors
export function createProviderError(
  provider: string,
  message: string,
  code: ProviderError["code"],
  statusCode?: number
): ProviderError {
  const error = new Error(message) as ProviderError;
  error.name = "ProviderError";
  error.provider = provider;
  error.code = code;
  error.statusCode = statusCode;
  error.retryable = code === "RATE_LIMIT" || code === "TIMEOUT" || code === "NETWORK_ERROR";
  return error;
}
