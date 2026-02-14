import React, { useState, useRef } from 'react';
import { UploadCloud, Eye, FileCheck, AlertTriangle, Loader2, FileType, FileText, Image as ImageIcon, X } from 'lucide-react';
import { analyzeLegalDocument } from '../services/geminiService';

interface FileState {
  name: string;
  type: string;
  previewUrl: string | null; // For images
  content: string; // Base64 for images/pdf, raw text for md/txt
}

export const ClauseAnalyzer: React.FC = () => {
  const [fileState, setFileState] = useState<FileState | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isText = file.type === 'text/plain' || file.type === 'text/markdown' || file.name.endsWith('.md');
      const reader = new FileReader();

      reader.onloadend = () => {
        const result = reader.result as string;
        
        setFileState({
          name: file.name,
          type: isText ? (file.type || 'text/markdown') : file.type,
          previewUrl: file.type.startsWith('image/') ? result : null,
          content: result
        });
        setAnalysis(null);
      };

      if (isText) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    }
  };

  const handleAnalyze = async () => {
    if (!fileState) return;
    
    setIsAnalyzing(true);
    try {
      let dataToSend = fileState.content;
      
      // If it's binary (PDF/Image), strip the data URL prefix
      if (!fileState.type.startsWith('text/')) {
        dataToSend = fileState.content.split(',')[1];
      }

      const result = await analyzeLegalDocument(dataToSend, fileState.type);
      setAnalysis(result);
    } catch (error) {
      console.error(error);
      setAnalysis("Der opstod en fejl under analysen. Prøv igen.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFileState(null);
    setAnalysis(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const renderFilePreview = () => {
    if (!fileState) return null;

    // Image Preview
    if (fileState.previewUrl) {
      return (
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-lg">
          <img src={fileState.previewUrl} alt="Preview" className="max-w-full max-h-[400px] object-contain shadow-md" />
          <button 
            onClick={clearFile}
            className="absolute top-2 right-2 bg-black/60 text-white p-2 rounded-full hover:bg-black/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      );
    }

    // PDF / Text / MD Preview
    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center p-8 bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4">
          {fileState.type === 'application/pdf' ? <FileType className="w-8 h-8" /> : <FileText className="w-8 h-8" />}
        </div>
        <h3 className="font-medium text-slate-800 text-lg text-center break-all">{fileState.name}</h3>
        <p className="text-slate-500 text-sm mt-1 uppercase tracking-wider">{fileState.type.split('/')[1] || 'Fil'}</p>
        
        <button 
          onClick={clearFile}
          className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 p-2"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Klausul & Dokument Analyse</h2>
        <p className="text-slate-600 mt-1">Upload et billede, PDF eller tekstfil. AI'en læser og tolker det juridiske indhold.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 min-h-0">
        
        {/* Upload Section */}
        <div className="flex flex-col space-y-4">
           <div 
             className={`
               flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-8 transition-colors relative
               ${fileState ? 'border-slate-300 bg-slate-50' : 'border-blue-300 bg-blue-50 hover:bg-blue-100 cursor-pointer'}
             `}
             onClick={() => !fileState && fileInputRef.current?.click()}
           >
             {fileState ? (
               renderFilePreview()
             ) : (
               <>
                 <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                   <UploadCloud className="w-8 h-8 text-blue-500" />
                 </div>
                 <h3 className="text-lg font-medium text-slate-700">Upload Dokument</h3>
                 <p className="text-sm text-slate-500 text-center mt-2 max-w-xs">
                   Støtter PDF, Billeder (JPG/PNG), Markdown og TXT filer.
                 </p>
               </>
             )}
             <input 
               ref={fileInputRef}
               type="file" 
               accept="image/*,.pdf,.md,.txt,text/plain,text/markdown" 
               className="hidden" 
               onChange={handleFileChange}
             />
           </div>

           <button
             onClick={handleAnalyze}
             disabled={!fileState || isAnalyzing}
             className={`
               w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all
               ${!fileState || isAnalyzing ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-500/20'}
             `}
           >
             {isAnalyzing ? (
               <>
                 <Loader2 className="w-5 h-5 animate-spin" /> Analyserer Dokument...
               </>
             ) : (
               <>
                 <Eye className="w-5 h-5" /> Start Analyse
               </>
             )}
           </button>
        </div>

        {/* Results Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-slate-500" />
            <h3 className="font-medium text-slate-700">AI Vurdering</h3>
          </div>
          
          <div className="flex-1 p-6 overflow-y-auto bg-white">
            {analysis ? (
              <div className="prose prose-slate max-w-none">
                <div className="whitespace-pre-wrap leading-relaxed text-slate-700">
                  {analysis}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8">
                <ScanTextPlaceholder />
                <p className="mt-4 text-center">Resultatet af analysen vises her.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

const ScanTextPlaceholder = () => (
  <svg className="w-24 h-24 opacity-20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
    <path d="M4 7V4H7" />
    <path d="M20 7V4H17" />
    <path d="M4 17V20H7" />
    <path d="M20 17V20H17" />
    <path d="M9 8H15" />
    <path d="M9 12H15" />
    <path d="M9 16H13" />
  </svg>
);
