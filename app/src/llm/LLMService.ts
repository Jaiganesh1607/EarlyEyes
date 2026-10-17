// ============================================================
// LLMService.ts
// Singleton service that orchestrates:
//   1. Model download (via ModelDownloader)
//   2. Model load into llama.rn
//   3. Prompt construction (via PromptBuilder)
//   4. Inference (with streaming) and JSON parsing
// ============================================================

import { initLlama, LlamaContext } from 'llama.rn';
import {
  ModelDownloader,
  isModelDownloaded,
  getModelPath,
} from './ModelDownloader';
import { buildPrompt } from './PromptBuilder';
import { MODEL_CONFIG } from './ModelConfig';
import {
  LLMInput,
  LLMOutput,
  DiseaseResult,
  ModelStatus,
  DownloadProgress,
} from './types';

type StatusListener = (status: ModelStatus) => void;

class LLMService {
  private _status: ModelStatus = 'not_downloaded';
  private _listeners: StatusListener[] = [];
  private _llamaContext: LlamaContext | null = null;

  // ----------------------------------------------------------
  // Status management
  // ----------------------------------------------------------

  get status(): ModelStatus {
    return this._status;
  }

  /** Subscribe to status changes. Returns an unsubscribe function. */
  onStatusChange(listener: StatusListener): () => void {
    this._listeners.push(listener);
    return () => {
      this._listeners = this._listeners.filter((l) => l !== listener);
    };
  }

  private setStatus(status: ModelStatus): void {
    this._status = status;
    this._listeners.forEach((l) => l(status));
  }

  // ----------------------------------------------------------
  // Initialisation (download + load)
  // ----------------------------------------------------------

  async initialize(
    onProgress?: (progress: DownloadProgress) => void,
    modelUrl?: string,
  ): Promise<void> {
    if (this._status === 'ready') return;

    if (
      this._status === 'loading' ||
      this._status === 'downloading'
    ) {
      throw new Error('Already initialising — please wait.');
    }

    try {
      const downloaded = await isModelDownloaded();

      if (!downloaded) {
        this.setStatus('downloading');
        await ModelDownloader.download(
          modelUrl ?? MODEL_CONFIG.defaultModelUrl,
          MODEL_CONFIG.modelFileName,
        );
        onProgress?.({ bytesDownloaded: MODEL_CONFIG.estimatedSizeBytes, totalBytes: MODEL_CONFIG.estimatedSizeBytes, percentage: 100 });
      }

      this.setStatus('loading');
      const modelPath = getModelPath();
      
      this._llamaContext = await initLlama({
        model: modelPath,
        use_mlock: false, // CRITICAL: True causes severe memory thrashing on Android
        n_ctx: 1024,      // Reduced to 1024 for speed
        n_threads: 4,     // Limit threads so OS doesn't choke
      });

      this.setStatus('ready');
    } catch (err) {
      this.setStatus('error');
      throw err;
    }
  }

  // ----------------------------------------------------------
  // Inference
  // ----------------------------------------------------------

  async runDiagnosis(input: LLMInput, onToken?: (token: string) => void): Promise<LLMOutput> {
    if (this._status !== 'ready' || !this._llamaContext) {
      throw new Error(
        `Model is not ready (status: "${this._status}"). Call initialize() first.`,
      );
    }

    const prompt = buildPrompt(input);
    let fullResponse = '';

    try {
      const result = await this._llamaContext.completion(
        {
          prompt,
          n_predict: MODEL_CONFIG.maxTokens,
          temperature: MODEL_CONFIG.temperature,
          stop: ['<|eot_id|>', '<|end_of_text|>', '```', '<|im_end|>'],
        },
        (progress) => {
          if (progress && progress.token) {
            fullResponse += progress.token;
            if (onToken) {
              onToken(progress.token);
            }
          }
        }
      );
      
      // If the completion promise returns the full text (which it usually does)
      if (result && result.text) {
          fullResponse = result.text;
      }
    } catch (err: any) {
      console.error('[LLMService] Inference failed:', err);
      return { results: [], rawResponse: fullResponse, parseError: err.message };
    }

    return this._parseResponse(fullResponse);
  }

  async runChat(contextText: string, history: import('./types').ChatMessage[], newQuestion: string, onToken?: (token: string) => void): Promise<string> {
    if (this._status !== 'ready' || !this._llamaContext) {
      throw new Error(`Model is not ready (status: "${this._status}"). Call initialize() first.`);
    }

    const { buildChatPrompt } = require('./PromptBuilder');
    const prompt = buildChatPrompt(contextText, history, newQuestion);
    let fullResponse = '';

    try {
      const result = await this._llamaContext.completion(
        {
          prompt,
          n_predict: MODEL_CONFIG.maxTokens,
          temperature: MODEL_CONFIG.temperature,
          stop: ['<|eot_id|>', '<|end_of_text|>', '```', '<|im_end|>'],
        },
        (progress) => {
          if (progress && progress.token) {
            fullResponse += progress.token;
            if (onToken) {
              onToken(progress.token);
            }
          }
        }
      );
      
      if (result && result.text) {
          fullResponse = result.text;
      }
    } catch (err: any) {
      console.error('[LLMService] Chat Inference failed:', err);
      throw err;
    }

    return fullResponse.trim();
  }

  // ----------------------------------------------------------
  // Response parser
  // ----------------------------------------------------------

  private _parseResponse(rawResponse: string): LLMOutput {
    let parseError: string | undefined;
    let results: DiseaseResult[] = [];

    try {
      let cleaned = rawResponse
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      // If the model got cut off, attempt to fix the trailing array bracket
      if (cleaned.lastIndexOf(']') < cleaned.lastIndexOf('}')) {
          cleaned = cleaned + ']';
      }

      const startArray = cleaned.indexOf('[');
      const endArray = cleaned.lastIndexOf(']');

      if (startArray !== -1 && endArray !== -1 && endArray > startArray) {
        const jsonStr = cleaned.slice(startArray, endArray + 1);
        const parsed = JSON.parse(jsonStr);
        results = Array.isArray(parsed) ? parsed : [parsed];
      } else {
        // Try parsing a single object if the model forgot the array brackets
        const startObj = cleaned.indexOf('{');
        const endObj = cleaned.lastIndexOf('}');
        if (startObj !== -1 && endObj !== -1 && endObj > startObj) {
          const jsonStr = cleaned.slice(startObj, endObj + 1);
          const parsed = JSON.parse(jsonStr);
          results = [parsed];
        } else {
          throw new Error('No JSON object or array found in model output.');
        }
      }
    } catch (err: any) {
      parseError = err?.message ?? 'Unknown parse error';
      console.error('[LLMService] Failed to parse model output:', parseError);
      console.error('[LLMService] Raw output was:', rawResponse);
    }

    return { results, rawResponse, parseError };
  }

  // ----------------------------------------------------------
  // Cleanup
  // ----------------------------------------------------------

  async unload(): Promise<void> {
    try {
      if (this._llamaContext) {
        await this._llamaContext.release();
        this._llamaContext = null;
      }
    } catch {
      // Ignore unload errors
    }
    this.setStatus('not_downloaded');
  }

  // ----------------------------------------------------------
  // Static convenience method
  // ----------------------------------------------------------

  static async generate(prompt: string): Promise<string> {
    const output = await llmService.runDiagnosis({
      symptoms: prompt,
      ragContent: '',
    });
    return output.rawResponse;
  }
}

// Export as singleton
export const llmService = new LLMService();