// AI Provider Abstraction Layer
// 
// Usage:
//   import { generateResponse, generateWithMessages } from "../_shared/ai/index.ts";
//
//   // Simple prompt
//   const response = await generateResponse("What is 2+2?", "openai/gpt-5-mini");
//
//   // With full message history
//   const response = await generateWithMessages({
//     messages: [
//       { role: "system", content: "You are a helpful assistant." },
//       { role: "user", content: "Hello!" }
//     ],
//     model: "google/gemini-2.5-flash",
//     maxTokens: 1024,
//     temperature: 0.7,
//     timeoutMs: 30000,
//   });

export * from "./types.ts";
export * from "./base-provider.ts";
export { 
  generateResponse, 
  generateWithMessages, 
  registerProvider, 
  getRegistry,
  registry 
} from "./registry.ts";

// Re-export providers for custom configuration
export { LovableProvider } from "./providers/lovable-provider.ts";
export { AnthropicProvider } from "./providers/anthropic-provider.ts";
export { OllamaProvider } from "./providers/ollama-provider.ts";
