import { BaseProvider } from "../base-provider.ts";
import { GenerateOptions, GenerateResponse, ProviderConfig } from "../types.ts";

/**
 * Lovable AI Gateway provider - supports OpenAI and Google models
 * via the unified Lovable AI gateway
 */
export class LovableProvider extends BaseProvider {
  readonly name = "lovable";
  readonly supportedModels = [
    // OpenAI models
    "openai/gpt-5",
    "openai/gpt-5-mini",
    "openai/gpt-5-nano",
    "openai/gpt-5.2",
    // Google Gemini models
    "google/gemini-2.5-pro",
    "google/gemini-2.5-flash",
    "google/gemini-2.5-flash-lite",
    "google/gemini-3-pro-preview",
    "google/gemini-3-flash-preview",
  ];

  private baseUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";

  constructor(config: ProviderConfig = {}) {
    super(config);
    if (!config.apiKey) {
      this.config.apiKey = Deno.env.get("LOVABLE_API_KEY");
    }
  }

  async generate(options: GenerateOptions): Promise<GenerateResponse> {
    const startTime = Date.now();
    const timeout = options.timeoutMs ?? this.config.defaultTimeout!;
    const maxTokens = options.maxTokens ?? this.config.defaultMaxTokens!;

    const response = await this.fetchWithTimeout(
      this.baseUrl,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: options.model,
          messages: options.messages,
          max_tokens: maxTokens,
          temperature: options.temperature ?? 0.7,
        }),
      },
      timeout
    );

    if (!response.ok) {
      const errorText = await response.text();
      this.handleErrorResponse(response.status, errorText);
    }

    const data = await response.json();
    const latencyMs = Date.now() - startTime;

    return {
      content: data.choices?.[0]?.message?.content || "",
      model: options.model,
      provider: this.name,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
      finishReason: data.choices?.[0]?.finish_reason === "length" ? "length" : "stop",
      latencyMs,
    };
  }
}
