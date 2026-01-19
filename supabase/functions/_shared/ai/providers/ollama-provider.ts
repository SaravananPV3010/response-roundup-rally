import { BaseProvider } from "../base-provider.ts";
import { GenerateOptions, GenerateResponse, ProviderConfig, createProviderError } from "../types.ts";

/**
 * Ollama provider for local/self-hosted models
 */
export class OllamaProvider extends BaseProvider {
  readonly name = "ollama";
  readonly supportedModels = [
    "llama2",
    "llama3",
    "llama3.1",
    "llama3.2",
    "mistral",
    "mixtral",
    "codellama",
    "phi",
    "phi3",
    "qwen",
    "qwen2",
    "deepseek-*",
    "gemma",
    "gemma2",
  ];

  constructor(config: ProviderConfig = {}) {
    super({
      baseUrl: Deno.env.get("OLLAMA_BASE_URL") || "http://localhost:11434",
      defaultTimeout: 60000, // Local models can be slower
      ...config,
    });
  }

  override supportsModel(model: string): boolean {
    // Ollama supports any model name - it's up to the user to pull it
    return true;
  }

  async generate(options: GenerateOptions): Promise<GenerateResponse> {
    const startTime = Date.now();
    const timeout = options.timeoutMs ?? this.config.defaultTimeout!;

    // Convert messages to Ollama format
    const systemMessage = options.messages.find(m => m.role === "system");
    const userMessages = options.messages.filter(m => m.role !== "system");

    let prompt = "";
    if (systemMessage) {
      prompt += `System: ${systemMessage.content}\n\n`;
    }
    for (const msg of userMessages) {
      prompt += `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}\n`;
    }
    prompt += "Assistant: ";

    try {
      const response = await this.fetchWithTimeout(
        `${this.config.baseUrl}/api/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: options.model,
            prompt,
            stream: false,
            options: {
              temperature: options.temperature ?? 0.7,
              num_predict: options.maxTokens ?? this.config.defaultMaxTokens,
            },
          }),
        },
        timeout
      );

      if (!response.ok) {
        const errorText = await response.text();
        if (errorText.includes("model") && errorText.includes("not found")) {
          throw createProviderError(
            this.name,
            `Model ${options.model} not found. Run: ollama pull ${options.model}`,
            "MODEL_NOT_FOUND",
            response.status
          );
        }
        this.handleErrorResponse(response.status, errorText);
      }

      const data = await response.json();
      const latencyMs = Date.now() - startTime;

      return {
        content: data.response || "",
        model: options.model,
        provider: this.name,
        usage: {
          promptTokens: data.prompt_eval_count || 0,
          completionTokens: data.eval_count || 0,
          totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
        },
        finishReason: data.done ? "stop" : "length",
        latencyMs,
      };
    } catch (error) {
      if ((error as any).code) throw error; // Already a ProviderError
      throw createProviderError(
        this.name,
        `Ollama not reachable at ${this.config.baseUrl}. Is it running?`,
        "NETWORK_ERROR"
      );
    }
  }
}
