import React, { useState } from 'react';
import { ShieldCheck, FileText, MessageSquare, ScanText, Menu, X } from 'lucide-react';
import { TerminationWizard } from './components/TerminationWizard';
import { ClauseAnalyzer } from './components/ClauseAnalyzer';
import { LegalChat } from './components/LegalChat';

enum View {
  DASHBOARD = 'DASHBOARD',
  TERMINATION = 'TERMINATION',
  ANALYZER = 'ANALYZER',
  CHAT = 'CHAT',
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const renderView = () => {
    switch (currentView) {
      case View.TERMINATION:
        return <TerminationWizard />;
      case View.ANALYZER:
        return <ClauseAnalyzer />;
      case View.CHAT:
        return <LegalChat />;
      case View.DASHBOARD:
      default:
        return <Dashboard onViewChange={setCurrentView} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black/50 lg:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-30 w-64 transform transition-transform duration-300 ease-in-out bg-slate-900 text-white
          lg:relative lg:translate-x-0
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex items-center justify-between h-16 px-6 bg-slate-950">
          <div className="flex items-center space-x-2 font-semibold text-xl tracking-tight">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <span>Arbejdsret<span className="text-slate-400 font-light">AI</span></span>
          </div>
          <button onClick={toggleSidebar} className="lg:hidden text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="px-4 py-6 space-y-2">
          <NavItem 
            icon={<ShieldCheck className="w-5 h-5" />} 
            label="Oversigt" 
            isActive={currentView === View.DASHBOARD}
            onClick={() => { setCurrentView(View.DASHBOARD); setIsSidebarOpen(false); }} 
          />
          <NavItem 
            icon={<FileText className="w-5 h-5" />} 
            label="Opsigelse Generator" 
            isActive={currentView === View.TERMINATION}
            onClick={() => { setCurrentView(View.TERMINATION); setIsSidebarOpen(false); }} 
          />
          <NavItem 
            icon={<ScanText className="w-5 h-5" />} 
            label="Klausul Analyse" 
            isActive={currentView === View.ANALYZER}
            onClick={() => { setCurrentView(View.ANALYZER); setIsSidebarOpen(false); }} 
          />
          <NavItem 
            icon={<MessageSquare className="w-5 h-5" />} 
            label="Juridisk Rådgiver" 
            isActive={currentView === View.CHAT}
            onClick={() => { setCurrentView(View.CHAT); setIsSidebarOpen(false); }} 
          />
        </nav>
        
        <div className="absolute bottom-0 w-full p-6 bg-slate-950">
          <div className="text-xs text-slate-500">
            <p className="font-semibold text-slate-400">System Status</p>
            <p className="mt-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Dansk Lovgivning DB: Aktiv
            </p>
            <p className="mt-1">Gemini 2.5 Flash: Forbundet</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-16 bg-white shadow-sm flex items-center px-6 lg:px-10 justify-between">
          <button onClick={toggleSidebar} className="lg:hidden text-slate-600 hover:text-slate-900">
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-medium text-slate-800">
            {currentView === View.DASHBOARD && 'HR Compliance Dashboard'}
            {currentView === View.TERMINATION && 'Agent: Opsigelsesbrev'}
            {currentView === View.ANALYZER && 'Agent: Multimodal Kontraktanalyse'}
            {currentView === View.CHAT && 'Agent: Juridisk Rådgivning'}
          </h1>
          <div className="text-sm text-slate-500 hidden sm:block">
            Licens: Enterprise DK
          </div>
        </header>
        
        <div className="flex-1 overflow-auto p-6 lg:p-10">
          {renderView()}
        </div>
      </main>
    </div>
  );
};

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`
      w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200
      ${isActive 
        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20' 
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
    `}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </button>
);

interface DashboardProps {
  onViewChange: (view: View) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onViewChange }) => (
  <div className="max-w-6xl mx-auto">
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-slate-800">Velkommen tilbage</h2>
      <p className="text-slate-600 mt-2">Vælg en compliance-opgave for at starte agenten.</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <ActionCard 
        title="Generer Opsigelse"
        description="Opret juridisk gyldige opsigelsesbreve baseret på Funktionærloven. Inkluderer beregning af varsel."
        icon={<FileText className="w-8 h-8 text-blue-500" />}
        onClick={() => onViewChange(View.TERMINATION)}
        color="border-l-blue-500"
      />
      <ActionCard 
        title="Analyser Overenskomst"
        description="Upload et billede af en kontraktklausul. Agenten udtrækker tekst og analyserer forpligtelser."
        icon={<ScanText className="w-8 h-8 text-purple-500" />}
        onClick={() => onViewChange(View.ANALYZER)}
        color="border-l-purple-500"
      />
      <ActionCard 
        title="Juridisk Chat"
        description="Stil spørgsmål om ferielov, barsel eller persondataforordningen (GDPR)."
        icon={<MessageSquare className="w-8 h-8 text-emerald-500" />}
        onClick={() => onViewChange(View.CHAT)}
        color="border-l-emerald-500"
      />
    </div>

    <div className="mt-10 p-6 bg-white rounded-xl shadow-sm border border-slate-200">
      <h3 className="font-semibold text-slate-800 mb-4">Seneste Lovændringer (Simuleret Feed)</h3>
      <div className="space-y-4">
        {[
          { date: '15. okt', title: 'Nye regler for registrering af arbejdstid', tag: 'EU Direktiv' },
          { date: '01. okt', title: 'Opdatering af satser for kørselsfradrag', tag: 'Skat' },
          { date: '28. sep', title: 'Præcisering af regler om 6. ferieuge i Industriens Overenskomst', tag: 'Overenskomst' }
        ].map((news, i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
             <div>
               <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{news.date}</span>
               <h4 className="text-sm font-medium text-slate-700 mt-1">{news.title}</h4>
             </div>
             <span className="px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600">{news.tag}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

interface ActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  color: string;
}

const ActionCard: React.FC<ActionCardProps> = ({ title, description, icon, onClick, color }) => (
  <button 
    onClick={onClick}
    className={`
      flex flex-col items-start p-6 bg-white rounded-xl shadow-sm border border-slate-200 
      hover:shadow-md transition-all duration-200 text-left group border-l-4 ${color}
    `}
  >
    <div className="mb-4 p-3 rounded-lg bg-slate-50 group-hover:bg-slate-100 transition-colors">
      {icon}
    </div>
    <h3 className="text-lg font-semibold text-slate-800 mb-2">{title}</h3>
    <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
  </button>
);

export default App;