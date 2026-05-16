import React, { useState, useRef, useEffect } from "react";
import { 
  Image, 
  Upload, 
  Play, 
  RefreshCcw, 
  Download, 
  Trash2, 
  Settings, 
  Layout, 
  CheckCircle2,
  AlertCircle,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AspectRatio, PromptItem } from "./types";

export default function App() {
  // Configuration States
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [promptText, setPromptText] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Progress States
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse prompts when text changes (only if not generating)
  useEffect(() => {
    if (!isGenerating && promptText.trim()) {
      const lines = promptText.split("\n").filter(line => line.trim() !== "");
      setPrompts(lines.map((line, idx) => ({
        id: `p-${idx}-${Date.now()}`,
        text: line.trim(),
        status: 'idle'
      })));
    } else if (!isGenerating && !promptText.trim()) {
      setPrompts([]);
    }
  }, [promptText, isGenerating]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReferenceImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateImage = async (item: PromptItem, retryCount = 0): Promise<string> => {
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: item.text,
          aspectRatio,
          referenceImage: referenceImage || undefined
        }),
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Generation failed");
      return data.imageUrl;
    } catch (error) {
      if (retryCount < 2) {
        console.log(`Retrying prompt: ${item.text} (${retryCount + 1})`);
        await new Promise(r => setTimeout(r, 2000)); // Wait before retry
        return generateImage(item, retryCount + 1);
      }
      throw error;
    }
  };

  const startBatchGeneration = async () => {
    if (prompts.length === 0) return;
    
    setIsGenerating(true);
    setCurrentIndex(0);
    
    // Reset all prompt statuses to idle
    setPrompts(prev => prev.map(p => ({ ...p, status: 'idle', imageUrl: undefined, error: undefined })));

    for (let i = 0; i < prompts.length; i++) {
      setCurrentIndex(i);
      
      // Update status to processing
      setPrompts(prev => prev.map((p, idx) => idx === i ? { ...p, status: 'processing' } : p));

      try {
        const imageUrl = await generateImage(prompts[i]);
        
        setPrompts(prev => prev.map((p, idx) => idx === i ? { 
          ...p, 
          status: 'completed', 
          imageUrl 
        } : p));
      } catch (err: any) {
        setPrompts(prev => prev.map((p, idx) => idx === i ? { 
          ...p, 
          status: 'error', 
          error: err.message 
        } : p));
      }

      // 2 second delay between successful generations as requested
      if (i < prompts.length - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    setIsGenerating(false);
    setCurrentIndex(-1);
  };

  const downloadImage = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${filename}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      // Fallback for cross-origin if blob fails
      window.open(url, '_blank');
    }
  };

  const regenerateSingle = async (index: number) => {
    const item = prompts[index];
    setPrompts(prev => prev.map((p, idx) => idx === index ? { ...p, status: 'processing', error: undefined } : p));
    
    try {
      const imageUrl = await generateImage(item);
      setPrompts(prev => prev.map((p, idx) => idx === index ? { ...p, status: 'completed', imageUrl } : p));
    } catch (err: any) {
      setPrompts(prev => prev.map((p, idx) => idx === index ? { ...p, status: 'error', error: err.message } : p));
    }
  };

  const progress = prompts.length > 0 ? (prompts.filter(p => p.status === 'completed' || p.status === 'error').length / prompts.length) * 100 : 0;

  return (
    <div className="flex h-screen w-full bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden">
      {/* Column 1: Sidebar Controls */}
      <aside className="w-[400px] h-full bg-white border-r border-slate-200 p-8 flex flex-col gap-8 shadow-sm z-20">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Batch Image Studio</h1>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">ChatGPT Image Generator</p>
        </div>

        {/* Row 1: Aspect Ratio */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-slate-700">1. Aspect Ratio</label>
          <div className="grid grid-cols-3 gap-2">
            {(["16:9", "9:16", "1:1"] as AspectRatio[]).map((ratio) => (
              <button
                key={ratio}
                disabled={isGenerating}
                onClick={() => setAspectRatio(ratio)}
                className={`py-3 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-1 text-sm font-bold ${
                  aspectRatio === ratio
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 hover:border-slate-300 text-slate-600 font-medium"
                } ${isGenerating ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span className={`rounded-sm transition-colors ${
                  ratio === "16:9" ? "w-6 h-3" : ratio === "9:16" ? "w-3 h-5" : "w-4 h-4"
                } ${aspectRatio === ratio ? "bg-indigo-600 opacity-60" : "bg-slate-300"}`} />
                {ratio}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Reference Image */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-slate-700">2. Reference Image</label>
          <div 
            onClick={() => !isGenerating && fileInputRef.current?.click()}
            className={`relative group cursor-pointer border-2 border-dashed rounded-xl p-4 transition-all duration-200 flex items-center justify-center gap-3 ${
              referenceImage ? "border-indigo-400 bg-indigo-50/50" : "border-slate-200 bg-slate-50 hover:border-indigo-400"
            } ${isGenerating ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="w-12 h-12 rounded bg-white shadow-sm border border-slate-100 flex items-center justify-center overflow-hidden text-[10px] text-slate-400 flex-shrink-0">
              {referenceImage ? (
                <img src={referenceImage} alt="Ref" className="w-full h-full object-cover" />
              ) : (
                <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
              )}
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-700 truncate">
                {referenceImage ? "reference_style.png" : "Select reference image"}
              </p>
              <p className="text-[10px] text-slate-400">
                {referenceImage ? "Click to replace image" : "Optional style guide"}
              </p>
            </div>
            {referenceImage && !isGenerating && (
              <button 
                onClick={(e) => { e.stopPropagation(); setReferenceImage(null); }}
                className="p-1 text-red-400 hover:text-red-500"
              >
                <Trash2 size={14} />
              </button>
            )}
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
          </div>
        </div>

        {/* Row 3: Prompt List */}
        <div className="flex-1 flex flex-col space-y-3 min-h-0">
          <label className="text-sm font-semibold text-slate-700">3. Prompt List (New line per prompt)</label>
          <textarea 
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            disabled={isGenerating}
            className="flex-1 w-full rounded-xl border border-slate-200 p-4 text-sm leading-relaxed focus:ring-2 focus:ring-indigo-500 outline-none resize-none bg-slate-50 font-sans custom-scrollbar"
            placeholder="Enter prompts..."
          />
        </div>

        {/* Row 4: Action */}
        <div className="space-y-4 pt-2">
          <button 
            disabled={isGenerating || prompts.length === 0}
            onClick={startBatchGeneration}
            className={`w-full font-bold py-4 rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
              isGenerating || prompts.length === 0
                ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                : "bg-slate-900 hover:bg-black text-white"
            }`}
          >
            {isGenerating && <Loader2 size={18} className="animate-spin" />}
            {isGenerating ? "ĐANG TẠO ẢNH..." : "BẮT ĐẦU TẠO ẢNH"}
          </button>

          {isGenerating && (
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <span>Processing prompt {currentIndex + 1}/{prompts.length}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-indigo-600 rounded-full" 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Column: Results */}
      <main className="flex-1 p-10 overflow-y-auto bg-[#F8FAFC]">
        <div className="flex justify-between items-end mb-8 sticky top-0 bg-[#F8FAFC]/80 backdrop-blur-sm pb-4 z-10 px-2">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Results Gallery</h2>
            <p className="text-sm font-medium text-slate-400">Browse and download generated masterpieces</p>
          </div>
          <div className="flex gap-4 text-xs font-semibold text-slate-400 uppercase tracking-widest">
            <span>Total: {prompts.length} Items</span>
            <span>•</span>
            <span>Batch Mode Active</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 max-w-4xl mx-auto">
          <AnimatePresence mode="popLayout">
            {prompts.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-32 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-200 rounded-2xl bg-white/50"
              >
                <Image size={48} className="mb-4 opacity-20" />
                <p className="font-bold text-lg text-slate-400">No prompts queued</p>
                <p className="text-sm">Start by entering prompts in the sidebar</p>
              </motion.div>
            ) : (
              prompts.map((p, index) => (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-white rounded-2xl p-4 flex gap-6 border transition-all duration-300 ${
                    p.status === 'processing' 
                      ? "border-indigo-200 shadow-md ring-1 ring-indigo-50" 
                      : "border-slate-200 shadow-sm"
                  } ${p.status === 'idle' ? "opacity-60 bg-slate-50/50 border-dashed" : ""}`}
                >
                  {/* Thumbnail */}
                  <div className={`w-32 h-32 rounded-xl flex-shrink-0 relative overflow-hidden border border-slate-100 shadow-inner ${
                    p.status === 'completed' ? "bg-slate-100" : "bg-slate-50/50"
                  }`}>
                    {p.status === 'completed' && p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.text} className="w-full h-full object-cover" />
                    ) : p.status === 'processing' ? (
                      <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                      </div>
                    ) : p.status === 'idle' ? (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-red-300 bg-red-50">
                        <AlertCircle size={24} />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`w-2 h-2 rounded-full ${
                          p.status === 'completed' ? "bg-green-500" : 
                          p.status === 'processing' ? "bg-indigo-500" : 
                          p.status === 'error' ? "bg-red-500" : "bg-slate-300"
                        }`} />
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${
                          p.status === 'completed' ? "text-green-600" : 
                          p.status === 'processing' ? "text-indigo-600" : 
                          p.status === 'error' ? "text-red-500" : "text-slate-400"
                        }`}>
                          {p.status === 'completed' ? "Completed" : 
                           p.status === 'processing' ? "Processing..." : 
                           p.status === 'error' ? "Failed" : "Queued"}
                        </span>
                      </div>
                      <p className={`text-sm font-semibold leading-tight ${
                        p.status === 'idle' ? "text-slate-400 italic" : "text-slate-800"
                      }`}>
                        {p.text}
                      </p>
                      {p.error && <p className="text-[10px] text-red-400 mt-1 line-clamp-1">{p.error}</p>}
                    </div>

                    <div className={`flex gap-2 transition-all duration-300 ${
                      p.status === 'completed' || p.status === 'error' ? "opacity-100" : "opacity-0 pointer-events-none"
                    }`}>
                      {p.status === 'completed' && (
                        <button 
                          onClick={() => downloadImage(p.imageUrl!, p.text.slice(0, 20))}
                          className="px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-bold border border-slate-200 transition-colors"
                        >
                          Download
                        </button>
                      )}
                      <button 
                        onClick={() => regenerateSingle(index)}
                        disabled={isGenerating}
                        className="px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-bold border border-slate-200 disabled:opacity-50 transition-colors"
                      >
                        Regenerate
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );

}

