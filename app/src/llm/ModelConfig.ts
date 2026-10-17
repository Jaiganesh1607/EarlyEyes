// ============================================================
// ModelConfig.ts — Update MODEL_URL to the real HuggingFace URL
//                  before shipping.
// ============================================================

/**
 * UPDATE THIS: Replace with the direct HuggingFace "resolve/main" URL
 * for gemma-4-E2B-it.litertlm once you know the exact repo path.
 *
 * Example pattern:
 *   https://huggingface.co/<org>/<repo>/resolve/main/<filename>.litertlm
 *
 * You can also pass a custom URL at runtime via LLMService.initialize().
 */
export const MODEL_CONFIG = {
  modelFileName: 'Llama-3.2-1B-Instruct-Q4_K_M.gguf',

  // ⬇ Replace this URL with the actual download link
  defaultModelUrl:
    'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf',

  /** Approximate model size in bytes (used for progress bar when server
   *  doesn't return Content-Length). 2 GB default. */
  estimatedSizeBytes: 2_000_000_000,

  /** Max new tokens the model may generate per call */
  maxTokens: 300,

  /** Sampling temperature — keep low for deterministic JSON output */
  temperature: 0.05,

  /** Top-K sampling */
  topK: 40,
} as const;