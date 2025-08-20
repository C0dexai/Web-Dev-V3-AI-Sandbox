import React, { useState } from 'react';
import OrchestratorPanel from './components/AgentsPanel';
import TermsOfService from './components/TermsOfService';
import PrivacyPolicy from './components/PrivacyPolicy';
import LandingPage from './components/LandingPage';

type View = 'app' | 'terms' | 'privacy';

interface AppProps {
 // No props needed for now
}

const App: React.FC<AppProps> = () => {
  const [showLanding, setShowLanding] = useState(true);
  const [currentView, setCurrentView] = useState<View>('app');
  const [isFocusMode, setIsFocusMode] = useState(false);

  if (showLanding) {
    return <LandingPage onEnter={() => setShowLanding(false)} />;
  }

  const renderContent = () => {
    switch (currentView) {
      case 'terms':
        return <TermsOfService onClose={() => setCurrentView('app')} />;
      case 'privacy':
        return <PrivacyPolicy onClose={() => setCurrentView('app')} />;
      case 'app':
      default:
        return <OrchestratorPanel isFocusMode={isFocusMode} onToggleFocusMode={() => setIsFocusMode(p => !p)} />;
    }
  };

  return (
    <div className="main-app-container h-screen w-screen overflow-hidden">
      <div className="flex flex-col h-full bg-transparent text-[var(--text-color)] font-sans">
        {!isFocusMode && (
          <header className="flex items-center justify-between p-4 bg-black/30 backdrop-blur-sm border-b border-[var(--neon-purple)]">
            <div className="flex items-center gap-3">
              <a href="/" aria-label="Home" className="brand-link">
                <img
                  src="https://andiegogiap.com/assets/aionex-icon-256.png"
                  alt="AIONEX"
                  width="128" height="128"
                  style={{height: '40px', width: 'auto', display: 'block'}}
                  loading="eager" decoding="async"
                />
              </a>
              <h1 className="text-2xl font-bold tracking-wider" style={{textShadow: '0 0 5px var(--neon-purple)'}}>AIONEX Sandbox</h1>
            </div>
            {/* Settings have been removed as API keys are now handled by environment variables. */}
          </header>
        )}
        
        <main className="flex-grow flex flex-col overflow-hidden">
          {renderContent()}
        </main>
        
        {!isFocusMode && (
           <footer className="bg-black/30 backdrop-blur-sm border-t border-[var(--neon-purple)] p-3 text-center text-xs text-gray-400">
              <p className="mb-2">
                This is a live application powered by the Gemini API. Prompts are sent to Google for processing.
              </p>
              <div>
                <button onClick={() => setCurrentView('terms')} className="hover:underline text-[var(--neon-blue)] hover:text-[var(--neon-pink)] mx-2 transition-colors">Terms of Service</button>
                |
                <button onClick={() => setCurrentView('privacy')} className="hover:underline text-[var(--neon-blue)] hover:text-[var(--neon-pink)] mx-2 transition-colors">Privacy Policy</button>
              </div>
          </footer>
        )}
      </div>
    </div>
  );
};

export default App;
