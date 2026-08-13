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
  modelFileName: 'gemma-4-E2B-it.litertlm',

  // ⬇ Replace this URL with the actual download link
  defaultModelUrl:
    'https://huggingface.co/google/gemma-3n-E2B-it-litert/resolve/main/gemma-3n-E2B-it.litertlm',

  /** Approximate model size in bytes (used for progress bar when server
   *  doesn't return Content-Length). 2 GB default. */
  estimatedSizeBytes: 2_000_000_000,

  /** Max new tokens the model may generate per call */
  maxTokens: 2048,

  /** Sampling temperature — keep low for deterministic JSON output */
  temperature: 0.05,

  /** Top-K sampling */
  topK: 40,
} as const;