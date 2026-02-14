import React, { useState, useRef } from 'react';
import { UploadCloud, Eye, FileCheck, AlertTriangle, Loader2 } from 'lucide-react';
import { analyzeLegalClauseImage } from '../services/geminiService';

export const ClauseAnalyzer: React.FC = () => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setAnalysis(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!imagePreview) return;
    
    setIsAnalyzing(true);
    try {
      const base64Data = imagePreview.split(',')[1]; // Remove data:image/jpeg;base64, prefix
      const result = await analyzeLegalClauseImage(base64Data);
      setAnalysis(result);
    } catch (error) {
      console.error(error);
      setAnalysis("Der opstod en fejl under analysen. Prøv igen.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Klausul Analyse (Multimodal)</h2>
        <p className="text-slate-600 mt-1">Upload et billede af en overenskomst eller kontrakt. AI'en læser og tolker teksten.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 min-h-0">
        
        {/* Upload Section */}
        <div className="flex flex-col space-y-4">
           <div 
             className={`
               flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-8 transition-colors
               ${imagePreview ? 'border-slate-300 bg-slate-50' : 'border-blue-300 bg-blue-50 hover:bg-blue-100 cursor-pointer'}
             `}
             onClick={() => !imagePreview && fileInputRef.current?.click()}
           >
             {imagePreview ? (
               <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-lg">
                 <img src={imagePreview} alt="Preview" className="max-w-full max-h-[400px] object-contain shadow-md" />
                 <button 
                   onClick={(e) => { e.stopPropagation(); setImagePreview(null); setAnalysis(null); }}
                   className="absolute top-2 right-2 bg-black/60 text-white p-2 rounded-full hover:bg-black/80 transition-colors"
                 >
                   <AlertTriangle className="w-4 h-4" />
                 </button>
               </div>
             ) : (
               <>
                 <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                   <UploadCloud className="w-8 h-8 text-blue-500" />
                 </div>
                 <h3 className="text-lg font-medium text-slate-700">Upload Billede</h3>
                 <p className="text-sm text-slate-500 text-center mt-2 max-w-xs">
                   Klik for at vælge en fil (JPG, PNG). Tag et billede af en paragraf.
                 </p>
               </>
             )}
             <input 
               ref={fileInputRef}
               type="file" 
               accept="image/*" 
               className="hidden" 
               onChange={handleFileChange}
             />
           </div>

           <button
             onClick={handleAnalyze}
             disabled={!imagePreview || isAnalyzing}
             className={`
               w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all
               ${!imagePreview || isAnalyzing ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-500/20'}
             `}
           >
             {isAnalyzing ? (
               <>
                 <Loader2 className="w-5 h-5 animate-spin" /> Analyserer Pixel Data...
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