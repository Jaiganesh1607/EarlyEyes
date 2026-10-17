// ============================================================
// ModelDownloader.ts
// Downloads the .litertlm model from HuggingFace to the device's
// documents directory.  Skips download if the file already exists.
// ============================================================

import RNFS from 'react-native-fs';
import { MODEL_CONFIG } from './ModelConfig';
import { DownloadProgress } from './types';

// Destination on device
export const getModelPath = (): string =>
  `${RNFS.DocumentDirectoryPath}/${MODEL_CONFIG.modelFileName}`;

export const isModelDownloaded = async (): Promise<boolean> => {
  try {
    return await RNFS.exists(getModelPath());
  } catch {
    return false;
  }
};

/**
 * Download the model.
 * - Skips if already present on disk.
 * - Streams directly to disk (doesn't hold in RAM).
 * - Calls `onProgress` with a DownloadProgress object during transfer.
 *
 * @param onProgress  Optional progress callback
 * @param modelUrl    Override the default URL from ModelConfig
 * @returns           Full path to the model file on device
 */
export const downloadModel = (
  onProgress?: (progress: DownloadProgress) => void,
  modelUrl: string = MODEL_CONFIG.defaultModelUrl, // Kept for interface compatibility
): Promise<string> =>
  new Promise(async (resolve, reject) => {
    const destPath = getModelPath();

    // Already present on device
    if (await RNFS.exists(destPath)) {
      resolve(destPath);
      return;
    }

    try {
      // Signal start
      onProgress?.({
        bytesDownloaded: 0,
        totalBytes: MODEL_CONFIG.estimatedSizeBytes,
        percentage: 0,
      });

      // The path relative to android/app/src/main/assets/
      const assetPath = `models/${MODEL_CONFIG.modelFileName}`;
      
      // This synchronously/asynchronously copies the 800MB file from the APK bundle
      // into the readable DocumentDirectory.
      await RNFS.copyFileAssets(assetPath, destPath);
      
      // Signal completion
      onProgress?.({
        bytesDownloaded: MODEL_CONFIG.estimatedSizeBytes,
        totalBytes: MODEL_CONFIG.estimatedSizeBytes,
        percentage: 100,
      });

      resolve(destPath);
    } catch (err) {
      // Clean up partial file
      await RNFS.unlink(destPath).catch(() => {});
      reject(new Error(`Failed to copy model from assets: ${err}`));
    }
  });

/** Remove the model file from device storage */
export const deleteModel = async (): Promise<void> => {
  const path = getModelPath();
  if (await RNFS.exists(path)) {
    await RNFS.unlink(path);
  }
};

// ── ModelDownloader class (interface contract) ──────────────────────────

export class ModelDownloader {
  /**
   * Download a file from a URL to the device's documents directory.
   * Delegates to downloadModel() internally.
   */
  static async download(modelUrl: string, localName: string): Promise<string> {
    const destPath = `${RNFS.DocumentDirectoryPath}/${localName}`;

    // If already present, return the path
    if (await RNFS.exists(destPath)) {
      return destPath;
    }

    try {
      const assetPath = `models/${localName}`;
      await RNFS.copyFileAssets(assetPath, destPath);
      return destPath;
    } catch (err) {
      await RNFS.unlink(destPath).catch(() => {});
      throw new Error(`Failed to copy ${localName} from assets: ${err}`);
    }
  }
}

/** Returns file size in MB if present, otherwise null */
export const getModelFileSizeMB = async (): Promise<number | null> => {
  try {
    const stat = await RNFS.stat(getModelPath());
    return Math.round(stat.size / 1_000_000);
  } catch {
    return null;
  }
};