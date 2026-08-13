// ============================================================
// LLMService.ts
// Singleton service that orchestrates:
//   1. Model download (via ModelDownloader)
//   2. Model load into the native runtime (via LiteRTNative)
//   3. Prompt construction (via PromptBuilder)
//   4. Inference and JSON parsing
// ============================================================

import { LiteRTNative } from './LLMNativeModule';
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

  /**
   * Downloads the model (if needed) and loads it into the native runtime.
   * Safe to call multiple times — skips download/load if already done.
   *
   * @param onProgress  Progress callback during download
   * @param modelUrl    Optional override for the download URL
   */
  async initialize(
    onProgress?: (progress: DownloadProgress) => void,
    modelUrl?: string,
  ): Promise<void> {
    // If already ready, no-op
    if (this._status === 'ready') return;

    // If already loading, wait; don't double-init
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
        // Fire progress at 100% since the class method doesn't support progress callback
        onProgress?.({ bytesDownloaded: MODEL_CONFIG.estimatedSizeBytes, totalBytes: MODEL_CONFIG.estimatedSizeBytes, percentage: 100 });
      }

      this.setStatus('loading');
      const modelPath = getModelPath();
      const loaded = await LiteRTNative.loadModel(modelPath);

      if (!loaded) {
        throw new Error('Native loadModel() returned false.');
      }

      this.setStatus('ready');
    } catch (err) {
      this.setStatus('error');
      throw err;
    }
  }

  // ----------------------------------------------------------
  // Inference
  // ----------------------------------------------------------

  /**
   * Run a diagnosis inference.
   * @throws if the model is not ready.
   */
  async runDiagnosis(input: LLMInput): Promise<LLMOutput> {
    if (this._status !== 'ready') {
      throw new Error(
        `Model is not ready (status: "${this._status}"). Call initialize() first.`,
      );
    }

    const prompt = buildPrompt(input);

    const rawResponse = await LiteRTNative.runInference(
      prompt,
      MODEL_CONFIG.maxTokens,
      MODEL_CONFIG.temperature,
    );

    return this._parseResponse(rawResponse);
  }

  // ----------------------------------------------------------
  // Response parser
  // ----------------------------------------------------------

  private _parseResponse(rawResponse: string): LLMOutput {
    let parseError: string | undefined;
    let results: DiseaseResult[] = [];

    try {
      // Strip any leading/trailing markdown fences the model might emit
      let cleaned = rawResponse
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      // Find the JSON array boundaries
      const start = cleaned.indexOf('[');
      const end = cleaned.lastIndexOf(']');

      if (start === -1 || end === -1 || end <= start) {
        throw new Error('No JSON array found in model output.');
      }

      const jsonStr = cleaned.slice(start, end + 1);
      const parsed = JSON.parse(jsonStr);

      if (!Array.isArray(parsed)) {
        throw new Error('Parsed value is not an array.');
      }

      results = parsed as DiseaseResult[];
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
      await LiteRTNative.unloadModel();
    } catch {
      // Ignore unload errors
    }
    this.setStatus('not_downloaded');
  }

  // ----------------------------------------------------------
  // Static convenience method (interface contract)
  // ----------------------------------------------------------

  /** Simple generate(prompt) → Promise<string> for direct use. */
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