/**
 * ONNX Model Manager
 * Handles downloading, caching, and loading of ONNX models for audio separation
 */

import { logger } from '@/lib/logger';

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  version: string;
  sizeMB: number;
  source: string;
  checksum?: string;
  supportedStems: string[];
  sampleRate: number;
  quality: 'fast' | 'balanced' | 'high';
}

export interface ModelDownloadProgress {
  modelId: string;
  progress: number; // 0-100
  downloadedMB: number;
  totalMB: number;
  status: 'downloading' | 'extracting' | 'complete' | 'error';
  error?: string;
}

// Available pre-trained models for vocal separation
export const AVAILABLE_MODELS: ModelInfo[] = [
  {
    id: 'mdx23c-instvoc',
    name: 'MDX23C InstVoc',
    description: 'High-quality vocal/instrumental separation (MDX23C)',
    version: '1.0.0',
    sizeMB: 148,
    source: 'https://huggingface.co/onnx-models/mdx23c-instvoc/resolve/main/model.onnx',
    supportedStems: ['vocals', 'instrumental'],
    sampleRate: 44100,
    quality: 'high',
  },
  {
    id: 'spleeter-2stems-44k',
    name: 'Spleeter 2-Stems',
    description: 'Fast 2-stem separation (vocals/accompaniment)',
    version: '1.0.0',
    sizeMB: 89,
    source: 'https://huggingface.co/onnx-models/spleeter-2stems-44k/resolve/main/model.onnx',
    supportedStems: ['vocals', 'accompaniment'],
    sampleRate: 44100,
    quality: 'balanced',
  },
  {
    id: 'demucs-htdemucs',
    name: 'Demucs HTDemucs',
    description: '4-stem separation (vocals/drums/bass/other)',
    version: '1.0.0',
    sizeMB: 285,
    source: 'https://huggingface.co/onnx-models/htdemucs/resolve/main/model.onnx',
    supportedStems: ['vocals', 'drums', 'bass', 'other'],
    sampleRate: 44100,
    quality: 'high',
  },
  {
    id: 'vr-deecho',
    name: 'VR DeEcho-DeReverb',
    description: 'Removes echo and reverb from vocals',
    version: '1.0.0',
    sizeMB: 42,
    source: 'https://huggingface.co/onnx-models/vr-deecho/resolve/main/model.onnx',
    supportedStems: ['vocals', 'instrumental'],
    sampleRate: 44100,
    quality: 'fast',
  },
];

// Local storage key for cached models
const MODEL_CACHE_KEY = 'onnx-model-cache';
const MODEL_DIR = 'models';

type ProgressCallback = (progress: ModelDownloadProgress) => void;

interface CachedModel {
  id: string;
  downloadedAt: number;
  sizeMB: number;
  blobKey: string;
}

class ModelManager {
  private cachedModels: Map<string, CachedModel> = new Map();
  private downloadingModels: Set<string> = new Set();
  private modelBlobs: Map<string, Blob> = new Map();

  constructor() {
    this.loadCacheFromStorage();
  }

  /**
   * Get list of available models with their download status
   */
  getAvailableModels(): (ModelInfo & { isDownloaded: boolean })[] {
    return AVAILABLE_MODELS.map(model => ({
      ...model,
      isDownloaded: this.cachedModels.has(model.id),
    }));
  }

  /**
   * Get model info by ID
   */
  getModelInfo(modelId: string): ModelInfo | undefined {
    return AVAILABLE_MODELS.find(m => m.id === modelId);
  }

  /**
   * Check if a model is downloaded
   */
  isModelDownloaded(modelId: string): boolean {
    return this.cachedModels.has(modelId);
  }

  /**
   * Download a model
   */
  async downloadModel(
    modelId: string,
    onProgress?: ProgressCallback
  ): Promise<Blob> {
    const model = this.getModelInfo(modelId);
    if (!model) {
      throw new Error(`Model not found: ${modelId}`);
    }

    // Check if already downloaded
    const cached = this.cachedModels.get(modelId);
    if (cached) {
      const blob = this.modelBlobs.get(modelId);
      if (blob) {
        onProgress?.({
          modelId,
          progress: 100,
          downloadedMB: model.sizeMB,
          totalMB: model.sizeMB,
          status: 'complete',
        });
        return blob;
      }
    }

    // Prevent parallel downloads
    if (this.downloadingModels.has(modelId)) {
      throw new Error(`Model ${modelId} is already downloading`);
    }
    this.downloadingModels.add(modelId);

    try {
      onProgress?.({
        modelId,
        progress: 0,
        downloadedMB: 0,
        totalMB: model.sizeMB,
        status: 'downloading',
      });

      const response = await fetch(model.source);
      if (!response.ok) {
        throw new Error(`Failed to download model: ${response.statusText}`);
      }

      const contentLength = response.headers.get('content-length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : model.sizeMB * 1024 * 1024;

      // Stream the response for progress tracking
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const chunks: Uint8Array[] = [];
      let downloadedBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        downloadedBytes += value.length;

        onProgress?.({
          modelId,
          progress: Math.round((downloadedBytes / totalBytes) * 100),
          downloadedMB: Math.round((downloadedBytes / (1024 * 1024)) * 10) / 10,
          totalMB: Math.round((totalBytes / (1024 * 1024)) * 10) / 10,
          status: 'downloading',
        });
      }

      // Combine chunks into blob
      const blob = new Blob(chunks);

      // Cache the model
      this.modelBlobs.set(modelId, blob);
      this.cachedModels.set(modelId, {
        id: modelId,
        downloadedAt: Date.now(),
        sizeMB: Math.round(blob.size / (1024 * 1024)),
        blobKey: modelId,
      });

      // Save to storage
      await this.saveCacheToStorage();
      await this.saveModelBlob(modelId, blob);

      onProgress?.({
        modelId,
        progress: 100,
        downloadedMB: model.sizeMB,
        totalMB: model.sizeMB,
        status: 'complete',
      });

      return blob;
    } catch (error) {
      onProgress?.({
        modelId,
        progress: 0,
        downloadedMB: 0,
        totalMB: model.sizeMB,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    } finally {
      this.downloadingModels.delete(modelId);
    }
  }

  /**
   * Load a model from cache or download if not available
   */
  async loadModel(
    modelId: string,
    onProgress?: ProgressCallback
  ): Promise<Blob> {
    // Try to get from memory cache
    const cachedBlob = this.modelBlobs.get(modelId);
    if (cachedBlob) {
      return cachedBlob;
    }

    // Try to load from storage
    const storedBlob = await this.loadModelBlob(modelId);
    if (storedBlob) {
      this.modelBlobs.set(modelId, storedBlob);
      return storedBlob;
    }

    // Download if not available
    return this.downloadModel(modelId, onProgress);
  }

  /**
   * Delete a cached model
   */
  async deleteModel(modelId: string): Promise<void> {
    this.modelBlobs.delete(modelId);
    this.cachedModels.delete(modelId);

    // Remove from IndexedDB
    try {
      const dbName = 'onnx-models';
      const request = indexedDB.open(dbName, 1);

      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('models', 'readwrite');
        const store = tx.objectStore('models');
        store.delete(modelId);
      };
    } catch {
      // Ignore storage errors
    }

    await this.saveCacheToStorage();
  }

  /**
   * Get total size of cached models
   */
  getCachedSizeMB(): number {
    let total = 0;
    for (const cached of this.cachedModels.values()) {
      total += cached.sizeMB;
    }
    return total;
  }

  /**
   * Clear all cached models
   */
  async clearAllModels(): Promise<void> {
    this.modelBlobs.clear();
    this.cachedModels.clear();

    try {
      const dbName = 'onnx-models';
      const request = indexedDB.open(dbName, 1);

      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('models', 'readwrite');
        const store = tx.objectStore('models');
        store.clear();
      };
    } catch {
      // Ignore storage errors
    }

    localStorage.removeItem(MODEL_CACHE_KEY);
  }

  // Private methods for storage

  private loadCacheFromStorage(): void {
    try {
      const stored = localStorage.getItem(MODEL_CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        for (const entry of parsed) {
          this.cachedModels.set(entry.id, entry);
        }
      }
    } catch {
      // Ignore errors
    }
  }

  private async saveCacheToStorage(): Promise<void> {
    try {
      const cacheData = Array.from(this.cachedModels.values());
      localStorage.setItem(MODEL_CACHE_KEY, JSON.stringify(cacheData));
    } catch {
      // Ignore errors
    }
  }

  private async saveModelBlob(modelId: string, blob: Blob): Promise<void> {
    return new Promise((resolve, reject) => {
      const dbName = 'onnx-models';
      const request = indexedDB.open(dbName, 1);

      request.onerror = () => reject(request.error);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('models')) {
          db.createObjectStore('models');
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('models', 'readwrite');
        const store = tx.objectStore('models');
        const putRequest = store.put(blob, modelId);

        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
    });
  }

  private async loadModelBlob(modelId: string): Promise<Blob | null> {
    return new Promise((resolve) => {
      const dbName = 'onnx-models';
      const request = indexedDB.open(dbName, 1);

      request.onerror = () => resolve(null);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('models')) {
          db.createObjectStore('models');
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('models')) {
          resolve(null);
          return;
        }

        const tx = db.transaction('models', 'readonly');
        const store = tx.objectStore('models');
        const getRequest = store.get(modelId);

        getRequest.onsuccess = () => {
          resolve(getRequest.result || null);
        };
        getRequest.onerror = () => resolve(null);
      };
    });
  }
}

// Singleton instance
let modelManagerInstance: ModelManager | null = null;

export function getModelManager(): ModelManager {
  if (!modelManagerInstance) {
    modelManagerInstance = new ModelManager();
  }
  return modelManagerInstance;
}

export function resetModelManager(): void {
  modelManagerInstance = null;
}
