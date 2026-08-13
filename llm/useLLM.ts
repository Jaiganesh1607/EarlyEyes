// ============================================================
// useLLM.ts
// React hook — drop into any component to drive the full
// download → load → diagnose lifecycle.
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { llmService } from './LLMService';
import { LLMInput, LLMOutput, ModelStatus, DownloadProgress } from './types';

interface UseLLMOptions {
  /** Custom model download URL (overrides ModelConfig default) */
  modelUrl?: string;
  /** If true, automatically initialise when the hook mounts */
  autoInit?: boolean;
}

interface UseLLMReturn {
  status: ModelStatus;
  downloadProgress: DownloadProgress | null;
  error: string | null;
  result: LLMOutput | null;
  isRunning: boolean;
  isReady: boolean;
  /** Trigger download + load. Safe to call multiple times. */
  initialize: () => Promise<void>;
  /** Run a diagnosis. Returns output or null on error. */
  diagnose: (input: LLMInput) => Promise<LLMOutput | null>;
  /** Clear the last result */
  clearResult: () => void;
  /** Clear the last error */
  clearError: () => void;
}

export const useLLM = (options: UseLLMOptions = {}): UseLLMReturn => {
  const { modelUrl, autoInit = false } = options;

  const [status, setStatus] = useState<ModelStatus>(llmService.status);
  const [downloadProgress, setDownloadProgress] =
    useState<DownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LLMOutput | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const isMounted = useRef(true);

  // Subscribe to status changes from the singleton
  useEffect(() => {
    isMounted.current = true;
    const unsub = llmService.onStatusChange((s) => {
      if (isMounted.current) setStatus(s);
    });
    return () => {
      isMounted.current = false;
      unsub();
    };
  }, []);

  const initialize = useCallback(async () => {
    if (!isMounted.current) return;
    setError(null);
    try {
      await llmService.initialize(
        (progress) => {
          if (isMounted.current) setDownloadProgress(progress);
        },
        modelUrl,
      );
      if (isMounted.current) setDownloadProgress(null);
    } catch (err: any) {
      if (isMounted.current) {
        setError(err?.message ?? 'Failed to initialise model');
      }
    }
  }, [modelUrl]);

  // Auto-initialise on mount if requested
  useEffect(() => {
    if (autoInit) initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoInit]);

  const diagnose = useCallback(
    async (input: LLMInput): Promise<LLMOutput | null> => {
      if (!isMounted.current) return null;
      setError(null);
      setIsRunning(true);
      try {
        const output = await llmService.runDiagnosis(input);
        if (isMounted.current) {
          setResult(output);
          if (output.parseError) {
            setError(`Parse error: ${output.parseError}`);
          }
        }
        return output;
      } catch (err: any) {
        if (isMounted.current) {
          setError(err?.message ?? 'Inference failed');
        }
        return null;
      } finally {
        if (isMounted.current) setIsRunning(false);
      }
    },
    [],
  );

  return {
    status,
    downloadProgress,
    error,
    result,
    isRunning,
    isReady: status === 'ready',
    initialize,
    diagnose,
    clearResult: () => setResult(null),
    clearError: () => setError(null),
  };
};
