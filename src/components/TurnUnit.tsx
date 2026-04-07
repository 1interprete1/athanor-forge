import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { Message } from '../types';
import { useStore } from '../contexts/StoreContext';
import { buildExportPayload, formatPayloadForCopy } from '../utils/exportHelper';
import { SimpleTooltip } from './SimpleTooltip';

interface TurnUnitProps {
  userMessage: Message | null;
  assistantMessage: Message | null;
  isGenerating: boolean;
  onSwitchBranch: (id: string, direction: 'prev' | 'next') => void;
  onCreateBranch: (id: string, newContent: string) => void;
  isMobile?: boolean;
}

export function TurnUnit({ 
  userMessage, 
  assistantMessage, 
  isGenerating, 
  onSwitchBranch, 
  onCreateBranch,
  isMobile = false
}: TurnUnitProps) {
  const [copiedType, setCopiedType] = useState<'input' | 'output' | 'full' | null>(null);
  const { exportConfig, devMode, showToast } = useStore();

  const handleCopy = async (type: 'input' | 'output' | 'full') => {
    try {
      let textToCopy = '';
      if (type === 'input' && userMessage) {
        textToCopy = formatPayloadForCopy(buildExportPayload(userMessage, exportConfig, devMode));
      } else if (type === 'output' && assistantMessage) {
        textToCopy = formatPayloadForCopy(buildExportPayload(assistantMessage, exportConfig, devMode));
      } else if (type === 'full') {
        const parts = [];
        if (userMessage) parts.push(formatPayloadForCopy(buildExportPayload(userMessage, exportConfig, devMode)));
        if (assistantMessage) parts.push(formatPayloadForCopy(buildExportPayload(assistantMessage, exportConfig, devMode)));
        textToCopy = parts.join('\n\n');
      }

      if (!textToCopy || textToCopy.trim() === '') {
        console.warn("[COPY_EMPTY_BLOCKED]");
        showToast("No content to copy", "error");
        return;
      }

      await navigator.clipboard.writeText(textToCopy);
      setCopiedType(type);
      showToast("Copied to clipboard", "success");
      setTimeout(() => setCopiedType(null), 2000);
    } catch (err) {
      console.warn('Failed to copy text: ', err);
      showToast("Copy failed", "error");
    }
  };

  return (
    <div className={`relative group/turn flex flex-col ${isMobile ? 'gap-3' : 'gap-4'}`}>
      {userMessage && (
        <ChatMessage 
          id={userMessage.id}
          role="user"
          content={userMessage.content}
          timestamp={userMessage.timestamp}
          branchIndex={userMessage.branchIndex}
          totalBranches={userMessage.totalBranches}
          onSwitchBranch={(dir) => onSwitchBranch(userMessage.id, dir)}
          onCreateBranch={(content) => onCreateBranch(userMessage.id, content)}
          isMobile={isMobile}
        />
      )}
      
      {assistantMessage && (
        <ChatMessage 
          id={assistantMessage.id}
          role="assistant"
          content={assistantMessage.content}
          timestamp={assistantMessage.timestamp}
          cost={assistantMessage.cost}
          tps={assistantMessage.tps}
          ttft={assistantMessage.ttft}
          jsonMode={assistantMessage.jsonMode}
          isGenerating={isGenerating}
          branchIndex={assistantMessage.branchIndex}
          totalBranches={assistantMessage.totalBranches}
          onSwitchBranch={(dir) => onSwitchBranch(assistantMessage.id, dir)}
          onCreateBranch={(content) => onCreateBranch(assistantMessage.id, content)}
          isMobile={isMobile}
          turnActions={
            <div className="flex items-center gap-2">
              {userMessage && (
                <button 
                  onClick={() => handleCopy('input')} 
                  aria-label="Copy input message"
                  className="flex items-center gap-1 text-zinc-500 hover:text-white transition-colors"
                  title="Copy Input (User)"
                >
                  {copiedType === 'input' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>INPUT</span>
                </button>
              )}
              {!isGenerating && (
                <button 
                  onClick={() => handleCopy('output')} 
                  aria-label="Copy output message"
                  className="flex items-center gap-1 text-zinc-500 hover:text-white transition-colors"
                  title="Copy Output (Model)"
                >
                  {copiedType === 'output' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>OUTPUT</span>
                </button>
              )}
              {userMessage && !isGenerating && (
                <button 
                  onClick={() => handleCopy('full')} 
                  aria-label="Copy full turn cycle"
                  className="flex items-center gap-1 text-zinc-500 hover:text-white transition-colors"
                  title="Copy Full Cycle"
                >
                  {copiedType === 'full' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>FULL CYCLE</span>
                </button>
              )}
            </div>
          }
        />
      )}
    </div>
  );
}
