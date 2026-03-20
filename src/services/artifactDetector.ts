/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ArtifactInstance, ArtifactType } from '../types';

export interface DetectionResult {
  isArtifact: boolean;
  type?: ArtifactType;
  language?: string;
  content?: string;
  isComplete: boolean;
}

export class ArtifactDetector {
  private currentContent: string = '';
  private activeArtifact: ArtifactInstance | null = null;

  constructor(
    private sessionId: string, 
    private messageId: string,
    private existingArtifacts: ArtifactInstance[] = []
  ) {}

  /**
   * Processes a new chunk of text from the stream.
   * Returns an updated artifact if one is being detected/streamed.
   */
  processChunk(chunk: string): ArtifactInstance | null {
    this.currentContent += chunk;

    // Look for code block start: ```language
    const codeBlockStartRegex = /```(\w+)?\n/g;
    let match;

    // If we don't have an active artifact, look for a start
    if (!this.activeArtifact) {
      // We search for the first occurrence of ``` in the whole content so far
      const startMatch = /```(\w+)?\n/.exec(this.currentContent);
      if (startMatch) {
        const language = startMatch[1] || 'text';
        const startIndex = startMatch.index + startMatch[0].length;
        
        // Check if this is an update of an existing artifact
        const title = this.generateTitle(language);
        const type = this.getArtifactType(language);
        const parent = this.existingArtifacts.find(a => 
          a.sessionId === this.sessionId && 
          a.title === title && 
          a.type === type
        );

        this.activeArtifact = {
          id: `art_${Date.now()}`,
          parentId: parent?.parentId || parent?.id,
          version: parent ? (parent.version + 1) : 1,
          sessionId: this.sessionId,
          messageId: this.messageId,
          type: type,
          language: language,
          title: title,
          content: this.currentContent.substring(startIndex),
          timestamp: Date.now(),
          isStreaming: true
        };
      }
    } else {
      // We are already streaming an artifact.
      // Check if it ended
      const endMatch = /```/.exec(chunk);
      if (endMatch) {
        // The block ended in this chunk
        const endPos = this.currentContent.lastIndexOf('```');
        const startPos = this.currentContent.indexOf('```');
        const firstNewLine = this.currentContent.indexOf('\n', startPos);
        
        this.activeArtifact = {
          ...this.activeArtifact,
          version: this.activeArtifact.version + 1,
          content: this.currentContent.substring(firstNewLine + 1, endPos),
          isStreaming: false
        };
        // After finishing, we might want to reset or handle multiple artifacts
        // For now, we return the finished one. 
        // In a real scenario, we'd need to handle multiple blocks in one message.
      } else {
        // Still streaming
        const startPos = this.currentContent.indexOf('```');
        const firstNewLine = this.currentContent.indexOf('\n', startPos);
        this.activeArtifact = {
          ...this.activeArtifact,
          version: this.activeArtifact.version + 1,
          content: this.currentContent.substring(firstNewLine + 1),
          isStreaming: true
        };
      }
    }

    return this.activeArtifact;
  }

  private getArtifactType(language: string): ArtifactType {
    const l = language.toLowerCase();
    if (['html', 'xml', 'svg'].includes(l)) return 'html';
    if (['mermaid'].includes(l)) return 'mermaid';
    if (['markdown', 'md'].includes(l)) return 'markdown';
    return 'code';
  }

  private generateTitle(language: string): string {
    const l = language.toLowerCase();
    switch (l) {
      case 'typescript':
      case 'ts':
      case 'tsx':
        return 'TypeScript Module';
      case 'javascript':
      case 'js':
      case 'jsx':
        return 'JavaScript Script';
      case 'python':
      case 'py':
        return 'Python Script';
      case 'rust':
      case 'rs':
        return 'Rust Crate';
      case 'html':
        return 'HTML Document';
      case 'css':
        return 'Stylesheet';
      case 'mermaid':
        return 'Diagram';
      case 'markdown':
      case 'md':
        return 'Documentation';
      case 'sql':
        return 'Database Query';
      case 'json':
        return 'Data Structure';
      case 'yaml':
      case 'yml':
        return 'Configuration';
      default:
        return 'Code Artifact';
    }
  }

  reset() {
    this.currentContent = '';
    this.activeArtifact = null;
  }
}
