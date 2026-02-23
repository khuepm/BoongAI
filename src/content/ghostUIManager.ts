// Ghost UI Manager Module
import { GhostUIElement } from '@/types';

export class GhostUIManager {
  private static elements: Map<string, GhostUIElement> = new Map();

  static showProcessing(commentId: string): void {
    const element = this.createGhostUI(commentId, 'processing', 'AI is processing...');
    this.elements.set(commentId, element);
    // TODO: Inject Ghost UI below command comment
  }

  static showError(commentId: string, errorMessage: string): void {
    const element = this.createGhostUI(commentId, 'error', errorMessage);
    this.elements.set(commentId, element);
    // TODO: Inject Ghost UI below command comment
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      this.remove(commentId);
    }, 10000);
  }

  static remove(commentId: string): void {
    const element = this.elements.get(commentId);
    if (element) {
      // TODO: Remove Ghost UI element from DOM
      this.elements.delete(commentId);
    }
  }

  private static createGhostUI(commentId: string, type: 'processing' | 'error', content: string): GhostUIElement {
    return {
      id: commentId,
      type,
      content,
      createdAt: Date.now()
    };
  }
}
