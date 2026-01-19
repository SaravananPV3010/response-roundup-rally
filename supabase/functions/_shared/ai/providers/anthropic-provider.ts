import { BaseProvider } from "../base-provider.ts";
import { GenerateOptions, GenerateResponse, ProviderConfig, createProviderError } from "../types.ts";

/**
 * Anthropic Claude provider
 */
export class AnthropicProvider extends BaseProvider {
  readonly name = "anthropic";
  readonly supportedModels = [
    "claude-3-opus-*",
    "claude-3-sonnet-*",
    "claude-3-haiku-*",
    "claude-3-5-sonnet-*",
    "claude-3-5-haiku-*",
  ];

  private baseUrl = "https://api.anthropic.com/v1/messages";

  constructor(config: ProviderConfig = {}) {
    super(config);
    if (!config.apiKey) {
      this.config.apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    }
  }

  override supportsModel(model: string): boolean {
    return model.startsWith("claude-");
  }

  async generate(options: GenerateOptions): Promise<GenerateResponse> {
    if (!this.config.apiKey) {
      throw createProviderError(this.name, "ANTHROPIC_API_KEY not configured", "AUTH_ERROR");
    }

    const startTime = Date.now();
    const timeout = options.timeoutMs ?? this.config.defaultTimeout!;
    const maxTokens = options.maxTokens ?? this.config.defaultMaxTokens!;

    // Extract system message and convert to Anthropic format
    const systemMessage = options.messages.find(m => m.role === "system");
    const userMessages = options.messages
      .filter(m => m.role !== "system")
      .map(m => ({ role: m.role, content: m.content }));

    const response = await this.fetchWithTimeout(
      this.baseUrl,
      {
        method: "POST",
        headers: {
          "x-api-key": this.config.apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: options.model,
          max_tokens: maxTokens,
          system: systemMessage?.content,
          messages: userMessages,
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
      content: data.content?.[0]?.text || "",
      model: options.model,
      provider: this.name,
      usage: data.usage ? {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      } : undefined,
      finishReason: data.stop_reason === "max_tokens" ? "length" : "stop",
      latencyMs,
    };
  }
}
