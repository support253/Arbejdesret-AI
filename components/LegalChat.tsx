import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, AlertCircle, Briefcase, Scale, Shield, FileText, HelpCircle } from 'lucide-react';
import { ChatMessage, LoadingState } from '../types';
import { sendChatMessage } from '../services/geminiService';

export const LegalChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'model',
      text: 'Hej. Jeg er din juridiske AI-assistent. Vælg et emne ovenfor eller stil et spørgsmål for at komme i gang.',
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [activeTopic, setActiveTopic] = useState('Generelt');
  const [status, setStatus] = useState<LoadingState>(LoadingState.IDLE);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const topics = [
    { id: 'Generelt', label: 'Generelt', icon: HelpCircle },
    { id: 'Opsigelse', label: 'Opsigelse & Varsel', icon: FileText },
    { id: 'Overenskomst', label: 'Overenskomst', icon: Scale },
    { id: 'GDPR', label: 'GDPR & Data', icon: Shield },
    { id: 'Ferie', label: 'Ferie & Barsel', icon: Briefcase },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || status === LoadingState.LOADING) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setStatus(LoadingState.LOADING);

    try {
      // Prepare history for API (exclude failed messages if any)
      const historyForApi = messages.map(m => ({ role: m.role, text: m.text }));
      
      const responseText = await sendChatMessage(historyForApi, userMsg.text, activeTopic);
      
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, botMsg]);
      setStatus(LoadingState.IDLE);
    } catch (error) {
      console.error(error);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: 'Beklager, der opstod en teknisk fejl. Kontroller venligst din internetforbindelse eller API nøgle.',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
      setStatus(LoadingState.ERROR);
    }
  };

  return (
    <div className="h-full max-w-4xl mx-auto flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-50 border-b border-slate-200">
        <div className="px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
            <Bot className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800">Juridisk Rådgiver</h2>
            <p className="text-xs text-slate-500">AI-drevet rådgivning baseret på dansk lovgivning</p>
          </div>
        </div>

        {/* Topic Selector */}
        <div className="px-6 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {topics.map((t) => {
            const Icon = t.icon;
            const isActive = activeTopic === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTopic(t.id)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap border
                  ${isActive 
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200 shadow-sm' 
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'}
                `}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex max-w-[85%] md:max-w-[75%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1
                ${msg.role === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}
              `}>
                {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              
              <div className={`
                p-4 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap
                ${msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'}
              `}>
                {msg.text}
              </div>
            </div>
          </div>
        ))}
        
        {status === LoadingState.LOADING && (
          <div className="flex justify-start w-full">
             <div className="flex gap-3 max-w-[80%]">
               <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-1">
                 <Bot className="w-5 h-5" />
               </div>
               <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex items-center gap-2">
                 <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                 <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                 <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
               </div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-200 bg-white">
        <div className="relative flex items-center gap-2">
           <input
             type="text"
             value={input}
             onChange={(e) => setInput(e.target.value)}
             onKeyDown={(e) => e.key === 'Enter' && handleSend()}
             placeholder={`Stil spørgsmål om ${activeTopic.toLowerCase()}...`}
             className="flex-1 bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-3 pl-4 outline-none transition-colors"
             disabled={status === LoadingState.LOADING}
           />
           <button
             onClick={() => handleSend()}
             disabled={!input.trim() || status === LoadingState.LOADING}
             className={`
               p-3 rounded-lg transition-all
               ${!input.trim() || status === LoadingState.LOADING 
                 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                 : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md'}
             `}
           >
             <Send className="w-5 h-5" />
           </button>
        </div>
        <div className="mt-2 flex items-center gap-1 text-xs text-slate-400 justify-center">
          <AlertCircle className="w-3 h-3" />
          <span>Kontekst: <span className="font-medium text-slate-500">{activeTopic}</span>. AI kan begå fejl.</span>
        </div>
      </div>
    </div>
  );
};