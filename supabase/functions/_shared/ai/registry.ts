import { AIProvider, GenerateOptions, GenerateResponse, createProviderError } from "./types.ts";
import { LovableProvider } from "./providers/lovable-provider.ts";
import { AnthropicProvider } from "./providers/anthropic-provider.ts";
import { OllamaProvider } from "./providers/ollama-provider.ts";

/**
 * Provider registry - manages all AI providers and routes requests
 */
class ProviderRegistry {
  private providers: Map<string, AIProvider> = new Map();
  private modelToProvider: Map<string, string> = new Map();

  constructor() {
    // Register default providers
    this.register(new LovableProvider());
    this.register(new AnthropicProvider());
    this.register(new OllamaProvider());
  }

  /**
   * Register a new provider
   */
  register(provider: AIProvider): void {
    this.providers.set(provider.name, provider);
    
    // Map models to this provider
    for (const model of provider.supportedModels) {
      if (!model.includes("*")) {
        this.modelToProvider.set(model, provider.name);
      }
    }
  }

  /**
   * Get a provider by name
   */
  getProvider(name: string): AIProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Find the best provider for a given model
   */
  findProviderForModel(model: string): AIProvider | undefined {
    // Check exact match first
    const providerName = this.modelToProvider.get(model);
    if (providerName) {
      return this.providers.get(providerName);
    }

    // Check pattern matches
    for (const [, provider] of this.providers) {
      if (provider.supportsModel(model)) {
        return provider;
      }
    }

    return undefined;
  }

  /**
   * List all registered providers
   */
  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * List all supported models
   */
  listModels(): { model: string; provider: string }[] {
    const models: { model: string; provider: string }[] = [];
    
    for (const [, provider] of this.providers) {
      for (const model of provider.supportedModels) {
        if (!model.includes("*")) {
          models.push({ model, provider: provider.name });
        }
      }
    }
    
    return models;
  }
}

// Singleton registry instance
const registry = new ProviderRegistry();

/**
 * Main entry point - generate a response using any registered provider
 */
export async function generateResponse(
  prompt: string,
  model: string,
  options: Partial<Omit<GenerateOptions, "messages" | "model">> = {}
): Promise<GenerateResponse> {
  const provider = registry.findProviderForModel(model);
  
  if (!provider) {
    throw createProviderError(
      "registry",
      `No provider found for model: ${model}. Available: ${registry.listModels().map(m => m.model).join(", ")}`,
      "MODEL_NOT_FOUND"
    );
  }

  return provider.generate({
    messages: [
      { role: "user", content: prompt }
    ],
    model,
    ...options,
  });
}

/**
 * Generate with full message history
 */
export async function generateWithMessages(
  options: GenerateOptions
): Promise<GenerateResponse> {
  const provider = registry.findProviderForModel(options.model);
  
  if (!provider) {
    throw createProviderError(
      "registry",
      `No provider found for model: ${options.model}`,
      "MODEL_NOT_FOUND"
    );
  }

  return provider.generate(options);
}

/**
 * Register a custom provider
 */
export function registerProvider(provider: AIProvider): void {
  registry.register(provider);
}

/**
 * Get the provider registry for advanced usage
 */
export function getRegistry(): ProviderRegistry {
  return registry;
}

export { registry };
