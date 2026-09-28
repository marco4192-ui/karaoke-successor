import { MultiMicrophoneManager } from './multi-microphone-manager';

// Singleton instance
let multiMicManagerInstance: MultiMicrophoneManager | null = null;

export function getMultiMicrophoneManager(): MultiMicrophoneManager {
  if (!multiMicManagerInstance) {
    multiMicManagerInstance = new MultiMicrophoneManager();
  }
  return multiMicManagerInstance;
}
