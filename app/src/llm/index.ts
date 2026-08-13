// ============================================================
// index.ts — Public API for the LLM layer
//
// Import from 'app/src/llm' (or the path alias your project uses)
// to access LLMService, useLLM, PromptBuilder, ModelDownloader,
// and all shared types.
// ============================================================

// Shared types
export type {
  DiseaseSource,
  DiseaseMetadata,
  DiseaseResult,
  LLMInput,
  LLMOutput,
  DownloadProgress,
  ModelStatus,
} from './types';

// Core classes / functions
export { LLMService } from './LLMService';
export { useLLM } from './useLLM';
export { PromptBuilder } from './PromptBuilder';
export type { ImageAnalysisResult, RagChunk } from './PromptBuilder';
export { ModelDownloader } from './ModelDownloader';

// Also re-export the singleton instance for non-React consumers
export { llmService } from './LLMService';

// Re-export supporting modules
export { MODEL_CONFIG } from './ModelConfig';
export { LiteRTNative } from './LLMNativeModule';
export type { NativeLiteRTModule } from './LLMNativeModule';
export {
  getModelPath,
  isModelDownloaded,
  downloadModel,
  deleteModel,
  getModelFileSizeMB,
} from './ModelDownloader';
export { buildPrompt } from './PromptBuilder';