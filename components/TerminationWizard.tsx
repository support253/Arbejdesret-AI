import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, Download, RefreshCw, Calendar, User, Briefcase, FileWarning, FileText } from 'lucide-react';
import { TerminationRequest, TerminationResponse, LoadingState } from '../types';
import { generateTerminationPackage } from '../services/geminiService';

export const TerminationWizard: React.FC = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState<LoadingState>(LoadingState.IDLE);
  const [result, setResult] = useState<TerminationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<TerminationRequest>({
    employee: {
      name: '',
      title: '',
      hireDate: '',
      address: '',
      isFunktionaer: true,
    },
    terminationDate: new Date().toISOString().split('T')[0],
    reason: '',
    notes: ''
  });

  const handleInputChange = (field: string, value: any, isEmployee = false) => {
    if (isEmployee) {
      setFormData(prev => ({ ...prev, employee: { ...prev.employee, [field]: value } }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(LoadingState.LOADING);
    setError(null);

    try {
      const data = await generateTerminationPackage(formData);
      setResult(data);
      setStep(2);
      setLoading(LoadingState.SUCCESS);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Der opstod en fejl under genereringen.");
      setLoading(LoadingState.ERROR);
    }
  };

  if (step === 2 && result) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-800">Resultat af Analyse</h2>
          <button 
            onClick={() => setStep(1)}
            className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Start Forfra
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Analysis Card */}
          <div className="md:col-span-1 space-y-6">
            <div className={`p-5 rounded-xl border ${result.isValidReason ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
              <h3 className="font-semibold flex items-center gap-2 text-slate-800 mb-3">
                {result.isValidReason ? <CheckCircle className="w-5 h-5 text-emerald-600"/> : <AlertTriangle className="w-5 h-5 text-amber-600"/>}
                Juridisk Vurdering
              </h3>
              <p className="text-sm text-slate-700">{result.explanation}</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Nøgledata</h4>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-slate-500">Varsel (Funktionærloven):</dt>
                  <dd className="font-medium text-slate-900">{result.calculatedNoticePeriod}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Sidste arbejdsdag:</dt>
                  <dd className="font-medium text-slate-900">{result.lastWorkingDay}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Lovhjemmel:</dt>
                  <dd className="font-medium text-slate-900 italic">{result.legalReference}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Letter Preview */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex justify-between items-center">
                <h3 className="font-medium text-slate-700">Udkast til Opsigelsesbrev</h3>
                <div className="flex items-center gap-3">
                   <span className="text-xs text-slate-400 hidden sm:block">Færdiggjort dokument</span>
                   <button 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-md transition-all active:scale-95 group"
                    onClick={() => alert('Download af PDF påbegyndt (simuleret)')}
                   >
                    <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" /> 
                    Download PDF
                  </button>
                </div>
              </div>
              <div className="p-8 font-serif text-slate-800 whitespace-pre-wrap leading-relaxed">
                {result.letterContent}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800">Opsigelse Generator</h2>
        <p className="text-slate-600 mt-1">Trin-for-trin guide til korrekt opsigelse.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-6">
        
        {/* Employee Info */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-slate-800 border-b pb-2 flex items-center gap-2">
            <User className="w-5 h-5 text-slate-400" />
            Medarbejder Oplysninger
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fulde Navn</label>
              <input 
                required
                type="text" 
                className="w-full rounded-lg border-slate-300 border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                value={formData.employee.name}
                onChange={(e) => handleInputChange('name', e.target.value, true)}
                placeholder="F.eks. Jens Hansen"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Jobtitel</label>
              <input 
                required
                type="text" 
                className="w-full rounded-lg border-slate-300 border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                value={formData.employee.title}
                onChange={(e) => handleInputChange('title', e.target.value, true)}
                placeholder="F.eks. Salgsassistent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Adresse</label>
            <input 
              required
              type="text" 
              className="w-full rounded-lg border-slate-300 border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              value={formData.employee.address}
              onChange={(e) => handleInputChange('address', e.target.value, true)}
              placeholder="Vejnavn 1, 1234 By"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ansættelsesdato</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input 
                  required
                  type="date" 
                  className="w-full pl-9 rounded-lg border-slate-300 border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  value={formData.employee.hireDate}
                  onChange={(e) => handleInputChange('hireDate', e.target.value, true)}
                />
              </div>
            </div>
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.employee.isFunktionaer}
                  onChange={(e) => handleInputChange('isFunktionaer', e.target.checked, true)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700">Er funktionær?</span>
              </label>
            </div>
          </div>
        </div>

        {/* Termination Details */}
        <div className="space-y-4 pt-4">
          <h3 className="text-lg font-medium text-slate-800 border-b pb-2 flex items-center gap-2">
             <Briefcase className="w-5 h-5 text-slate-400" />
             Opsigelsesdetaljer
          </h3>

          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Årsag til opsigelse</label>
             <textarea 
               required
               className="w-full rounded-lg border-slate-300 border px-3 py-2 h-24 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
               value={formData.reason}
               onChange={(e) => handleInputChange('reason', e.target.value)}
               placeholder="Beskriv årsagen detaljeret (f.eks. nedskæringer, samarbejdsproblemer...)"
             />
             <p className="text-xs text-slate-500 mt-1">Vær så specifik som muligt for at få den bedste juridiske vurdering.</p>
          </div>

          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Interne noter (valgfri)</label>
             <input 
               type="text"
               className="w-full rounded-lg border-slate-300 border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
               value={formData.notes}
               onChange={(e) => handleInputChange('notes', e.target.value)}
               placeholder="Andet relevant info til brevet"
             />
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-lg flex items-start gap-2">
            <FileWarning className="w-5 h-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={loading === LoadingState.LOADING}
            className={`
              px-6 py-3 rounded-lg text-white font-medium shadow-lg shadow-blue-500/20
              flex items-center gap-2 transition-all
              ${loading === LoadingState.LOADING ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'}
            `}
          >
            {loading === LoadingState.LOADING ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" /> Behandler Juridisk Data...
              </>
            ) : (
              <>
                Generer Dokument <FileText className="w-5 h-5" />
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};
