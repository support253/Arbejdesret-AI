import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, AlertCircle, Briefcase, Scale, Shield, FileText, HelpCircle, Trash2, Plus, MessageSquare, Menu, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { ChatMessage, ChatSession, LoadingState } from '../types';
import { sendChatMessage } from '../services/geminiService';

const STORAGE_KEY = 'legal_chat_sessions_v1';
const LEGACY_STORAGE_KEY = 'legal_chat_history';

const WELCOME_MESSAGE_TEXT = `Velkommen til din juridiske assistent.

Jeg er trænet i dansk arbejdsret og kan hjælpe dig med:
• Beregning af opsigelsesvarsler
• Spørgsmål om Funktionærloven
• Fortolkning af overenskomster
• GDPR og persondata

Hvad vil du gerne vide mere om i dag?`;

const SUGGESTED_QUESTIONS = [
  "Hvad er opsigelsesvarslet efter 2 års ansættelse?",
  "Er frokostpausen betalt?",
  "Hvad er reglerne for 6. ferieuge?",
  "Hvornår må man bortvise en medarbejder?"
];

export const LegalChat: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<LoadingState>(LoadingState.IDLE);
  
  // Topic state for new chats.
  const [newChatTopic, setNewChatTopic] = useState('Generelt');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const topics = [
    { id: 'Generelt', label: 'Generelt', icon: HelpCircle },
    { id: 'Opsigelse', label: 'Opsigelse', icon: FileText },
    { id: 'Overenskomst', label: 'Overenskomst', icon: Scale },
    { id: 'GDPR', label: 'GDPR', icon: Shield },
    { id: 'Ferie', label: 'Ferie', icon: Briefcase },
  ];

  // Helper to create a fresh session
  const createNewSession = (initialMessage?: string): ChatSession => {
    const msgs: ChatMessage[] = [];
    if (initialMessage) {
      msgs.push({
        id: 'welcome',
        role: 'model',
        text: initialMessage,
        timestamp: Date.now()
      });
    }

    return {
      id: Date.now().toString(),
      title: "Ny Samtale",
      messages: msgs,
      updatedAt: Date.now(),
      topic: 'Generelt'
    };
  };

  // Load sessions on mount
  useEffect(() => {
    const savedSessions = localStorage.getItem(STORAGE_KEY);
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        parsed.sort((a: ChatSession, b: ChatSession) => b.updatedAt - a.updatedAt);
        setSessions(parsed);
        
        // If we have sessions, select the most recent one
        if (parsed.length > 0) {
          setActiveSessionId(parsed[0].id);
        } else {
          // Saved array was empty, create default
          initDefaultSession();
        }
      } catch (e) {
        console.error("Failed to parse sessions", e);
        initDefaultSession();
      }
    } else {
      // Check legacy or init default
      const legacyHistory = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyHistory) {
        try {
          const messages = JSON.parse(legacyHistory);
          if (messages.length > 0) {
            const newSession: ChatSession = {
              id: Date.now().toString(),
              title: "Tidligere samtale",
              messages: messages,
              updatedAt: Date.now(),
              topic: 'Generelt'
            };
            setSessions([newSession]);
            setActiveSessionId(newSession.id);
            localStorage.setItem(STORAGE_KEY, JSON.stringify([newSession]));
            localStorage.removeItem(LEGACY_STORAGE_KEY);
            return;
          }
        } catch (e) {
          console.error("Failed to migrate legacy history");
        }
      }
      // No legacy, no sessions -> Create Welcome Session
      initDefaultSession();
    }
  }, []);

  const initDefaultSession = () => {
    const defaultSession = createNewSession(WELCOME_MESSAGE_TEXT);
    setSessions([defaultSession]);
    setActiveSessionId(defaultSession.id);
  };

  // Save sessions whenever they change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [sessions]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [sessions, activeSessionId, status]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getActiveSession = () => sessions.find(s => s.id === activeSessionId);
  
  const currentMessages = getActiveSession()?.messages || [];
  const currentTopic = getActiveSession()?.topic || newChatTopic;

  const handleNewChat = () => {
    const newSession = createNewSession(WELCOME_MESSAGE_TEXT);
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setNewChatTopic('Generelt');
    setInput('');
    setSidebarOpen(false);
  };

  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    
    // If we deleted the active one, switch to another or create new default
    if (activeSessionId === id) {
      if (newSessions.length > 0) {
        setActiveSessionId(newSessions[0].id);
      } else {
        // No sessions left, create a fresh one immediately so UI isn't empty
        const fresh = createNewSession(WELCOME_MESSAGE_TEXT);
        setSessions([fresh]);
        setActiveSessionId(fresh.id);
      }
    }
  };

  const handleSend = async (e?: React.FormEvent, overrideInput?: string) => {
    e?.preventDefault();
    const textToSend = overrideInput || input;
    
    if (!textToSend.trim() || status === LoadingState.LOADING) return;

    setInput('');
    setStatus(LoadingState.LOADING);

    let sessionId = activeSessionId;
    let updatedSessions = [...sessions];

    // If for some reason no session is active (shouldn't happen with new logic, but safe fallback)
    if (!sessionId) {
      const newSession = createNewSession();
      updatedSessions = [newSession, ...sessions];
      sessionId = newSession.id;
      setActiveSessionId(sessionId);
    }

    // Update Title if it's the first user message (and title is default "Ny Samtale")
    const sessionIndex = updatedSessions.findIndex(s => s.id === sessionId);
    if (sessionIndex !== -1) {
      const isFirstUserMsg = !updatedSessions[sessionIndex].messages.some(m => m.role === 'user');
      if (isFirstUserMsg) {
        updatedSessions[sessionIndex].title = textToSend.slice(0, 30) + (textToSend.length > 30 ? '...' : '');
      }
    }

    // Add User Message
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: textToSend,
      timestamp: Date.now()
    };

    updatedSessions = updatedSessions.map(s => {
      if (s.id === sessionId) {
        return {
          ...s,
          messages: [...s.messages, userMsg],
          updatedAt: Date.now()
        };
      }
      return s;
    });
    setSessions(updatedSessions);

    // Prepare history for API (exclude the newly added user message to avoid duplication in next step)
    const currentSession = updatedSessions.find(s => s.id === sessionId);
    const messagesForHistory = currentSession 
      ? currentSession.messages.slice(0, -1).map(m => ({ role: m.role, text: m.text })) 
      : [];

    try {
      const { text: responseText, sources } = await sendChatMessage(messagesForHistory, userMsg.text, currentSession?.topic);
      
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: Date.now(),
        sources: sources
      };

      setSessions(prev => prev.map(s => {
        if (s.id === sessionId) {
          return {
            ...s,
            messages: [...s.messages, botMsg],
            updatedAt: Date.now()
          };
        }
        return s;
      }));

      setStatus(LoadingState.IDLE);
    } catch (error) {
      console.error(error);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: 'Beklager, der opstod en fejl. Tjek din internetforbindelse eller API nøgle.',
        timestamp: Date.now()
      };
      
      setSessions(prev => prev.map(s => {
        if (s.id === sessionId) {
          return { ...s, messages: [...s.messages, errorMsg] };
        }
        return s;
      }));
      setStatus(LoadingState.ERROR);
    }
  };

  return (
    <div className="flex h-[700px] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="absolute inset-0 bg-black/50 z-10 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - History */}
      <div className={`
        absolute md:relative z-20 h-full w-64 bg-slate-50 border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-4 border-b border-slate-200">
          <button 
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Ny Samtale
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {sessions.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-sm">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              Ingen tidligere samtaler
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {sessions.map(session => (
                <div 
                  key={session.id}
                  onClick={() => { setActiveSessionId(session.id); setSidebarOpen(false); }}
                  className={`
                    p-3 cursor-pointer hover:bg-white transition-colors group relative
                    ${activeSessionId === session.id ? 'bg-white border-l-4 border-l-emerald-500 shadow-sm' : 'border-l-4 border-l-transparent text-slate-600'}
                  `}
                >
                  <h3 className="text-sm font-medium truncate pr-6 text-slate-800">{session.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-400">
                      {new Date(session.updatedAt).toLocaleDateString('da-DK', {day: 'numeric', month: 'short'})}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded-full scale-90 origin-left">
                      {session.topic || 'Generelt'}
                    </span>
                  </div>
                  
                  <button 
                    onClick={(e) => handleDeleteSession(e, session.id)}
                    className="absolute right-2 top-3 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Slet samtale"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50/30">
        
        {/* Header */}
        <div className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden text-slate-500">
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex flex-col">
              <span className="font-semibold text-slate-800 flex items-center gap-2">
                Juridisk Rådgiver
                {activeSessionId && <span className="text-xs font-normal text-slate-400 px-2 py-0.5 bg-slate-100 rounded-full">Historik</span>}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
             <div className="hidden sm:flex gap-1">
              {topics.map((t) => {
                const Icon = t.icon;
                const isSelected = currentTopic === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      if (activeSessionId) {
                         setSessions(prev => prev.map(s => s.id === activeSessionId ? {...s, topic: t.id} : s));
                      } else {
                         setNewChatTopic(t.id);
                      }
                    }}
                    className={`
                      p-1.5 rounded-md transition-all
                      ${isSelected 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'text-slate-400 hover:bg-slate-100'}
                    `}
                    title={t.label}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
             </div>
             <div className="sm:hidden text-sm font-medium text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
               {currentTopic}
             </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {currentMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 opacity-60">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                 <Bot className="w-8 h-8 text-slate-400" />
              </div>
              <p>Starter samtale...</p>
            </div>
          ) : (
            <>
              {currentMessages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex max-w-[90%] md:max-w-[80%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm
                      ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'}
                    `}>
                      {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    
                    <div className={`
                      p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm
                      ${msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-tr-none' 
                        : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'}
                    `}>
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                      
                      {/* Render Sources */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className={`mt-3 pt-2 border-t flex flex-wrap gap-2 ${msg.role === 'user' ? 'border-blue-500/30' : 'border-slate-100'}`}>
                          {msg.sources.map((source, idx) => (
                            <a 
                              key={idx} 
                              href={source.uri} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className={`
                                text-xs px-2 py-1 rounded-md transition-colors flex items-center gap-1 max-w-full truncate
                                ${msg.role === 'user' 
                                  ? 'bg-blue-700 text-blue-100 hover:bg-blue-800' 
                                  : 'bg-slate-100 text-blue-600 hover:bg-slate-200'}
                              `}
                            >
                              <LinkIcon className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate max-w-[150px]">{source.title}</span>
                              <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-50" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Suggestions Chips (Only show if only 1 message exists - the welcome message) */}
              {currentMessages.length === 1 && currentMessages[0].role === 'model' && (
                <div className="pl-11 grid grid-cols-1 sm:grid-cols-2 gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  {SUGGESTED_QUESTIONS.map((question, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(undefined, question)}
                      className="text-left text-xs sm:text-sm text-slate-600 bg-white border border-slate-200 hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 px-4 py-2 rounded-xl transition-all shadow-sm"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {status === LoadingState.LOADING && (
            <div className="flex justify-start w-full animate-pulse">
               <div className="flex gap-3 max-w-[80%]">
                 <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0 mt-1" />
                 <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm w-16 h-10" />
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t border-slate-200">
           <form onSubmit={(e) => handleSend(e)} className="relative flex items-center gap-2">
             <input
               type="text"
               value={input}
               onChange={(e) => setInput(e.target.value)}
               placeholder={`Stil spørgsmål om ${currentTopic.toLowerCase()}...`}
               className="flex-1 bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-3 pr-12 outline-none transition-shadow shadow-sm"
               disabled={status === LoadingState.LOADING}
             />
             <button
               type="submit"
               disabled={!input.trim() || status === LoadingState.LOADING}
               className={`
                 absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-md transition-all flex items-center justify-center
                 ${!input.trim() || status === LoadingState.LOADING 
                   ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                   : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'}
               `}
             >
               <Send className="w-4 h-4" />
             </button>
           </form>
           <div className="mt-2 flex justify-center">
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                AI-genereret indhold kan være upræcist. Tjek altid vigtige juridiske oplysninger.
              </span>
           </div>
        </div>

      </div>
    </div>
  );
};
