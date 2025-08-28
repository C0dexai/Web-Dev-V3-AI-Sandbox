import React, { useState } from 'react';
import useStore from '../store';
import { MaximizeIcon, SaveIcon, UndoIcon, RedoIcon } from './Icons';

interface OrbMenuProps {
  onToggleFocusMode: () => void;
}

const OrbMenu: React.FC<OrbMenuProps> = ({ onToggleFocusMode }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { saveState, lastSavedTimestamp, undo, redo, canUndo, canRedo } = useStore(state => ({
        saveState: state.saveState,
        lastSavedTimestamp: state.lastSavedTimestamp,
        undo: state.undo,
        redo: state.redo,
        canUndo: state.canUndo(),
        canRedo: state.canRedo(),
    }));

    const formatTime = (date: Date | null) => {
        if (!date) return 'never';
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="fixed bottom-4 left-4 z-50">
            {isOpen && (
                <div className="mb-3 p-3 bg-[var(--card-bg)] backdrop-blur-xl border border-[var(--neon-purple)] rounded-2xl shadow-2xl neon-glow-purple flex flex-col gap-2 w-48 animate-fade-in-up">
                    <button
                        onClick={() => { undo(); setIsOpen(false); }}
                        disabled={!canUndo}
                        className="flex items-center gap-3 w-full p-2 text-left text-sm text-gray-200 hover:bg-black/40 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <UndoIcon className="h-5 w-5 text-[var(--neon-blue)]" />
                        <span>Undo Change</span>
                    </button>
                    <button
                        onClick={() => { redo(); setIsOpen(false); }}
                        disabled={!canRedo}
                        className="flex items-center gap-3 w-full p-2 text-left text-sm text-gray-200 hover:bg-black/40 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <RedoIcon className="h-5 w-5 text-[var(--neon-blue)]" />
                        <span>Redo Change</span>
                    </button>
                    <button
                        onClick={() => { saveState(); setIsOpen(false); }}
                        className="flex items-center gap-3 w-full p-2 text-left text-sm text-gray-200 hover:bg-black/40 rounded-md transition-colors"
                    >
                        <SaveIcon className="h-5 w-5 text-[var(--neon-green)]" />
                        <span>Save Session</span>
                    </button>
                    <button
                        onClick={() => { onToggleFocusMode(); setIsOpen(false); }}
                        className="flex items-center gap-3 w-full p-2 text-left text-sm text-gray-200 hover:bg-black/40 rounded-md transition-colors"
                    >
                        <MaximizeIcon className="h-5 w-5 text-[var(--neon-blue)]" />
                        <span>Focus Mode</span>
                    </button>
                     <div className="border-t border-[var(--card-border)] my-1"></div>
                     <div className="px-2 text-xs text-gray-400">
                        <p>Auto-saves enabled.</p>
                        <p>Last manual save: {formatTime(lastSavedTimestamp)}</p>
                     </div>
                </div>
            )}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`h-14 w-14 rounded-full flex items-center justify-center transition-all duration-300 ${isOpen ? 'bg-[var(--neon-pink)] neon-glow-purple' : 'bg-[var(--neon-purple)] neon-glow-blue'}`}
                aria-label="Open session menu"
                title="Session Menu"
            >
                <img 
                  src="https://andiegogiap.com/assets/aionex-icon-256.png" 
                  alt="AIONEX Logo" 
                  className={`h-8 w-8 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
                />
            </button>
        </div>
    );
};

export default OrbMenu;
