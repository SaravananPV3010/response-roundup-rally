import React, { useState, useRef, useEffect, useCallback } from "react";
import { Plus, ChevronDown, ArrowUp, X, FileText, Loader2, Check, Archive } from "lucide-react";

/* --- ICONS --- */
export const Icons = {
  Logo: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <g clipPath="url(#clip0)">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <defs>
        <clipPath id="clip0">
          <rect width="24" height="24" fill="white" />
        </clipPath>
      </defs>
    </svg>
  ),
  Plus: Plus,
  Thinking: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 2a8 8 0 0 0-8 8c0 3.5 2 6 5 7v3a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-3c3-1 5-3.5 5-7a8 8 0 0 0-8-8z" />
      <path d="M9 22h6" />
    </svg>
  ),
  SelectArrow: ChevronDown,
  ArrowUp: ArrowUp,
  X: X,
  FileText: FileText,
  Loader2: Loader2,
  Check: Check,
  Archive: Archive,
  Clock: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
};

/* --- UTILS --- */
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

/* --- COMPONENTS --- */

// 1. File Preview Card
interface AttachedFile {
  id: string;
  file: File;
  type: string;
  preview: string | null;
  uploadStatus: string;
  content?: string;
}

interface FilePreviewCardProps {
  file: AttachedFile;
  onRemove: (id: string) => void;
}

const FilePreviewCard: React.FC<FilePreviewCardProps> = ({ file, onRemove }) => {
  const isImage = file.type.startsWith("image/") && file.preview;

  return (
    <div className="group relative shrink-0 w-[140px] h-[100px] rounded-xl overflow-hidden border border-claude-bg-300 bg-claude-bg-100 transition-all hover:border-claude-accent/50">
      {isImage ? (
        <div className="w-full h-full relative">
          <img
            src={file.preview!}
            alt={file.file.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-3">
          <div className="w-10 h-10 rounded-lg bg-claude-bg-200 flex items-center justify-center">
            <div className="text-claude-text-300">
              <Icons.FileText className="w-5 h-5" />
            </div>
            <span className="absolute bottom-0 right-0 text-[8px] font-mono bg-claude-bg-300 px-1 rounded">
              {file.file.name.split('.').pop()}
            </span>
          </div>
          <div className="w-full text-center">
            <p className="text-xs font-medium text-claude-text-200 truncate">
              {file.file.name}
            </p>
            <p className="text-[10px] text-claude-text-400">
              {formatFileSize(file.file.size)}
            </p>
          </div>
        </div>
      )}

      {/* Remove Button Overlay */}
      <button
        onClick={() => onRemove(file.id)}
        className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/70 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Icons.X className="w-3 h-3" />
      </button>

      {/* Upload Status */}
      {file.uploadStatus === 'uploading' && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <Icons.Loader2 className="w-5 h-5 text-white animate-spin" />
        </div>
      )}
    </div>
  );
};

// 2. Pasted Content Card
interface PastedContentCardProps {
  content: {
    id: string;
    content: string;
    timestamp: Date;
  };
  onRemove: (id: string) => void;
}

const PastedContentCard: React.FC<PastedContentCardProps> = ({ content, onRemove }) => {
  return (
    <div className="group relative shrink-0 w-[180px] h-[100px] rounded-xl overflow-hidden border border-claude-bg-300 bg-claude-bg-100 p-3 transition-all hover:border-claude-accent/50">
      <div className="h-full overflow-hidden">
        <p className="text-[11px] text-claude-text-300 leading-relaxed line-clamp-4">
          {content.content}
        </p>
      </div>

      <div className="absolute bottom-2 left-2">
        <span className="text-[9px] font-mono bg-claude-bg-200 text-claude-text-400 px-1.5 py-0.5 rounded">
          PASTED
        </span>
      </div>

      <button
        onClick={() => onRemove(content.id)}
        className="absolute top-2 right-2 p-[3px] bg-claude-bg-100 border border-claude-bg-300 rounded-full text-claude-text-400 hover:text-claude-text-200 transition-colors shadow-sm opacity-0 group-hover:opacity-100"
      >
        <Icons.X className="w-3 h-3" />
      </button>
    </div>
  );
};

// 3. Model Selector
interface Model {
  id: string;
  name: string;
  description: string;
  badge?: string;
}

interface ModelSelectorProps {
  models: Model[];
  selectedModel: string;
  onSelect: (modelId: string) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ models, selectedModel, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentModel = models.find(m => m.id === selectedModel) || models[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center justify-center relative shrink-0 transition font-base duration-300 ease-[cubic-bezier(0.165,0.85,0.45,1)] h-8 rounded-xl px-3 min-w-[4rem] active:scale-[0.98] whitespace-nowrap text-xs pl-2.5 pr-2 gap-1 
          ${isOpen
            ? 'bg-claude-bg-200 text-claude-text-100'
            : 'text-claude-text-300 hover:text-claude-text-200 hover:bg-claude-bg-200'}`}
      >
        <span className="flex items-center gap-1 whitespace-nowrap">
          <span className="leading-tight flex items-center gap-1">
            <span>{currentModel.name}</span>
          </span>
        </span>
        <span className="transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <Icons.SelectArrow className="w-4 h-4" />
        </span>
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-64 bg-claude-bg-100 border border-claude-bg-300 rounded-xl shadow-lg z-50 p-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {models.map(model => (
            <button
              key={model.id}
              onClick={() => {
                onSelect(model.id);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2.5 rounded-xl flex items-start justify-between group transition-colors hover:bg-claude-bg-200`}
            >
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-claude-text-100">
                    {model.name}
                  </span>
                  {model.badge && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-claude-accent/10 text-claude-accent">
                      {model.badge}
                    </span>
                  )}
                </div>
                <span className="text-xs text-claude-text-400">
                  {model.description}
                </span>
              </div>
              {selectedModel === model.id && (
                <Icons.Check className="w-4 h-4 text-claude-accent mt-1" />
              )}
            </button>
          ))}

          <div className="border-t border-claude-bg-300 mt-1.5 pt-1.5" />

          <button className="w-full text-left px-3 py-2 rounded-xl text-xs text-claude-text-400 hover:text-claude-text-200 hover:bg-claude-bg-200 transition-colors flex items-center justify-between">
            More models
            <Icons.SelectArrow className="w-3 h-3 -rotate-90" />
          </button>
        </div>
      )}
    </div>
  );
};

// 4. Main Chat Input Component
interface ClaudeChatInputProps {
  onSendMessage: (data: {
    message: string;
    files: AttachedFile[];
    pastedContent: { id: string; content: string; timestamp: Date }[];
    model: string;
    isThinkingEnabled: boolean;
  }) => void;
}

export const ClaudeChatInput: React.FC<ClaudeChatInputProps> = ({ onSendMessage }) => {
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [pastedContent, setPastedContent] = useState<{ id: string; content: string; timestamp: Date }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedModel, setSelectedModel] = useState("sonnet-4.5");
  const [isThinkingEnabled, setIsThinkingEnabled] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const models = [
    { id: "opus-4.5", name: "Opus 4.5", description: "Most capable for complex work" },
    { id: "sonnet-4.5", name: "Sonnet 4.5", description: "Best for everyday tasks" },
    { id: "haiku-4.5", name: "Haiku 4.5", description: "Fastest for quick answers" }
  ];

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 384) + "px";
    }
  }, [message]);

  // File Handling
  const handleFiles = useCallback((newFilesList: FileList | File[]) => {
    const newFiles = Array.from(newFilesList).map(file => {
      const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name);
      return {
        id: Math.random().toString(36).substr(2, 9),
        file,
        type: isImage ? 'image/unknown' : (file.type || 'application/octet-stream'),
        preview: isImage ? URL.createObjectURL(file) : null,
        uploadStatus: 'pending'
      };
    });

    setFiles(prev => [...prev, ...newFiles]);

    setMessage(prev => {
      if (prev) return prev;
      if (newFiles.length === 1) {
        const f = newFiles[0];
        if (f.type.startsWith('image/')) return "Analyzed image...";
        return "Analyzed document...";
      }
      return `Analyzed ${newFiles.length} files...`;
    });

    newFiles.forEach(f => {
      setTimeout(() => {
        setFiles(prev => prev.map(p => p.id === f.id ? { ...p, uploadStatus: 'complete' } : p));
      }, 800 + Math.random() * 1000);
    });
  }, []);

  // Drag & Drop
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  };

  // Paste Handling
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const pastedFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) pastedFiles.push(file);
      }
    }

    if (pastedFiles.length > 0) {
      e.preventDefault();
      handleFiles(pastedFiles);
      return;
    }

    const text = e.clipboardData.getData('text');
    if (text.length > 300) {
      e.preventDefault();
      const snippet = {
        id: Math.random().toString(36).substr(2, 9),
        content: text,
        timestamp: new Date()
      };
      setPastedContent(prev => [...prev, snippet]);

      if (!message) {
        setMessage("Analyzed pasted text...");
      }
    }
  };

  const handleSend = () => {
    if (!message.trim() && files.length === 0 && pastedContent.length === 0) return;
    onSendMessage({ message, files, pastedContent, model: selectedModel, isThinkingEnabled });
    setMessage("");
    setFiles([]);
    setPastedContent([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasContent = message.trim() || files.length > 0 || pastedContent.length > 0;

  return (
    <div
      className="w-full max-w-3xl mx-auto relative"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Main Container */}
      <div className="relative bg-claude-bg-100 rounded-2xl border border-claude-bg-300 shadow-claude-input hover:shadow-claude-input-hover focus-within:shadow-claude-input-focus transition-shadow duration-200">
        <div className="p-3 sm:p-4 flex flex-col gap-3">
          {/* Artifacts (Files & Pastes) */}
          {(files.length > 0 || pastedContent.length > 0) && (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {pastedContent.map(content => (
                <PastedContentCard
                  key={content.id}
                  content={content}
                  onRemove={(id) => setPastedContent(prev => prev.filter(c => c.id !== id))}
                />
              ))}
              {files.map(file => (
                <FilePreviewCard
                  key={file.id}
                  file={file}
                  onRemove={(id) => setFiles(prev => prev.filter(f => f.id !== id))}
                />
              ))}
            </div>
          )}

          {/* Input Area */}
          <div className="relative flex-1">
            <div className="flex flex-col">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={handleKeyDown}
                placeholder="How can I help you today?"
                className="w-full bg-transparent border-0 outline-none text-claude-text-100 text-base placeholder:text-claude-text-400 resize-none overflow-hidden py-0 leading-relaxed block font-normal antialiased"
                rows={1}
                autoFocus
                style={{ minHeight: '1.5em' }}
              />
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex gap-2 w-full items-center">
            {/* Left Tools */}
            <div className="relative flex-1 flex items-center shrink min-w-0 gap-1">
              {/* Attach Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center justify-center relative shrink-0 transition-colors duration-200 h-8 w-8 rounded-lg active:scale-95 text-claude-text-400 hover:text-claude-text-200 hover:bg-claude-bg-200"
                type="button"
                aria-label="Attach files"
              >
                <Icons.Plus className="w-5 h-5" />
              </button>

              {/* Extended Thinking Button */}
              <div className="flex shrink min-w-8 !shrink-0 group relative">
                <button
                  onClick={() => setIsThinkingEnabled(!isThinkingEnabled)}
                  className={`transition-all duration-200 h-8 w-8 flex items-center justify-center rounded-lg active:scale-95
                    ${isThinkingEnabled
                      ? 'text-claude-accent bg-claude-accent/10'
                      : 'text-claude-text-400 hover:text-claude-text-200 hover:bg-claude-bg-200'}
                  `}
                  aria-pressed={isThinkingEnabled}
                  aria-label="Extended thinking"
                >
                  <Icons.Thinking className="w-5 h-5" />
                </button>

                {/* Tooltip */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-claude-text-100 text-claude-bg-0 text-[11px] font-medium rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 flex items-center gap-1 shadow-sm tracking-wide">
                  <span>Extended thinking</span>
                  <span className="opacity-60 text-[10px]">⇧+Ctrl+E</span>
                </div>
              </div>
            </div>

            {/* Right Tools */}
            <div className="flex flex-row items-center min-w-0 gap-1">
              {/* Model Selector */}
              <div className="shrink-0 p-1 -m-1">
                <ModelSelector
                  models={models}
                  selectedModel={selectedModel}
                  onSelect={setSelectedModel}
                />
              </div>

              {/* Send Button */}
              <div>
                <button
                  onClick={handleSend}
                  disabled={!hasContent}
                  className={`
                    inline-flex items-center justify-center relative shrink-0 transition-colors h-8 w-8 rounded-xl active:scale-95
                    ${hasContent
                      ? 'bg-claude-accent text-claude-bg-0 hover:bg-claude-accent-hover shadow-md'
                      : 'bg-claude-accent/30 text-claude-bg-0/60 cursor-default'}
                  `}
                  type="button"
                  aria-label="Send message"
                >
                  <Icons.ArrowUp className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-claude-bg-200/90 border-2 border-dashed border-claude-accent rounded-2xl z-50 flex flex-col items-center justify-center backdrop-blur-sm pointer-events-none">
          <Icons.Archive className="w-10 h-10 text-claude-accent mb-2 animate-bounce" />
          <p className="text-claude-accent font-medium">Drop files to upload</p>
        </div>
      )}

      {/* Hidden Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = '';
        }}
      />

      <div className="text-center mt-4">
        <p className="text-xs text-claude-text-500">
          AI can make mistakes. Please check important information.
        </p>
      </div>
    </div>
  );
};

export default ClaudeChatInput;
