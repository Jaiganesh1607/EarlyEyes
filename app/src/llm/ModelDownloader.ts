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
  modelUrl: string = MODEL_CONFIG.defaultModelUrl,
): Promise<string> =>
  new Promise(async (resolve, reject) => {
    const destPath = getModelPath();

    // Already downloaded — skip
    if (await RNFS.exists(destPath)) {
      resolve(destPath);
      return;
    }

    const task = RNFS.downloadFile({
      fromUrl: modelUrl,
      toFile: destPath,
      headers: {
        // HuggingFace sometimes needs this for large file downloads
        Accept: 'application/octet-stream',
      },
      background: true,          // keep downloading when app backgrounds (iOS)
      discretionary: false,      // prioritise immediately (iOS)
      progressInterval: 500,     // call onProgress every 500 ms
      progress: (res) => {
        const total =
          res.contentLength > 0
            ? res.contentLength
            : MODEL_CONFIG.estimatedSizeBytes;

        onProgress?.({
          bytesDownloaded: res.bytesWritten,
          totalBytes: total,
          percentage: Math.min(
            100,
            Math.floor((res.bytesWritten / total) * 100),
          ),
        });
      },
    });

    task.promise
      .then((result) => {
        if (result.statusCode === 200) {
          resolve(destPath);
        } else {
          // Clean up partial file
          RNFS.unlink(destPath).catch(() => {});
          reject(
            new Error(
              `Download failed — HTTP ${result.statusCode}. Check the model URL in ModelConfig.ts`,
            ),
          );
        }
      })
      .catch(async (err) => {
        // Clean up partial file
        await RNFS.unlink(destPath).catch(() => {});
        reject(err);
      });
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
    // Override the model path to use the caller-supplied fileName
    const destPath = `${RNFS.DocumentDirectoryPath}/${localName}`;

    // If already present, return the path
    if (await RNFS.exists(destPath)) {
      return destPath;
    }

    return new Promise<string>((resolve, reject) => {
      const task = RNFS.downloadFile({
        fromUrl: modelUrl,
        toFile: destPath,
        headers: { Accept: 'application/octet-stream' },
        background: true,
        discretionary: false,
      });

      task.promise
        .then((result) => {
          if (result.statusCode === 200) {
            resolve(destPath);
          } else {
            RNFS.unlink(destPath).catch(() => {});
            reject(new Error(`Download failed — HTTP ${result.statusCode}`));
          }
        })
        .catch(async (err) => {
          await RNFS.unlink(destPath).catch(() => {});
          reject(err);
        });
    });
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