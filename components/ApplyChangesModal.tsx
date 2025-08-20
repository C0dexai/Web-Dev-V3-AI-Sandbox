import React, { useState, useMemo } from 'react';
import { SaveIcon, XIcon, CheckIcon, DocumentTextIcon } from './Icons';

interface ApplyChangesModalProps {
    codeUpdates: { path: string; content: string }[];
    onClose: () => void;
    onConfirm: (decision: { action: 'apply' } | { action: 'save_as', newPath: string }) => void;
}

const ApplyChangesModal: React.FC<ApplyChangesModalProps> = ({ codeUpdates, onClose, onConfirm }) => {
    const [showSaveAs, setShowSaveAs] = useState(false);
    
    // Only allow "Save As" for single HTML file changes
    const canSaveAs = useMemo(() => {
        return codeUpdates.length === 1 && codeUpdates[0].path.endsWith('.html');
    }, [codeUpdates]);

    // Suggest a default name for the new file
    const suggestedPath = useMemo(() => {
        if (!canSaveAs) return '';
        const originalPath = codeUpdates[0].path;
        const parts = originalPath.split('/');
        const fileName = parts.pop() || 'file.html';
        const dir = parts.join('/');
        const newFileName = `copy-of-${fileName}`;
        return `${dir}/${newFileName}`;
    }, [canSaveAs, codeUpdates]);
    
    const [newPath, setNewPath] = useState(suggestedPath);

    const handleSaveAs = () => {
        if (newPath.trim()) {
            onConfirm({ action: 'save_as', newPath: newPath.startsWith('/') ? newPath : `/${newPath}` });
        }
    };

    const handleApply = () => {
        onConfirm({ action: 'apply' });
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center" onClick={onClose}></div>
            <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in" aria-modal="true" role="dialog">
                <div className="bg-[var(--card-bg)] backdrop-blur-xl border border-[var(--neon-purple)] rounded-2xl shadow-2xl neon-glow-purple w-full max-w-lg">
                    <div className="flex items-center justify-between p-4 bg-black/30 border-b border-[var(--card-border)]">
                        <h2 className="text-lg font-bold text-[var(--neon-pink)]">Confirm Code Changes</h2>
                        <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-md text-gray-300" title="Close">
                            <XIcon className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="p-6 space-y-4">
                        <p className="text-sm text-gray-300">The AI agent has proposed the following file changes. How would you like to proceed?</p>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2 border border-[var(--card-border)] bg-black/20 p-3 rounded-md">
                            {codeUpdates.map(update => (
                                <div key={update.path} className="flex items-center gap-3 text-sm">
                                    <DocumentTextIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                                    <span className="font-mono truncate">{update.path}</span>
                                </div>
                            ))}
                        </div>

                        {showSaveAs ? (
                            <div className="space-y-3 pt-4 border-t border-[var(--card-border)] animate-fade-in">
                                <h3 className="font-semibold text-gray-200">Save As New File</h3>
                                <div>
                                    <label htmlFor="new-file-path" className="block text-sm text-gray-400 mb-1">New file path:</label>
                                    <input
                                        id="new-file-path"
                                        type="text"
                                        value={newPath}
                                        onChange={(e) => setNewPath(e.target.value)}
                                        className="w-full p-2 bg-black/30 border border-[var(--card-border)] rounded-md focus:ring-2 focus:ring-[var(--neon-blue)] focus:outline-none transition font-mono"
                                        placeholder="/path/to/new-file.html"
                                    />
                                </div>
                                <div className="flex justify-end gap-3">
                                    <button onClick={() => setShowSaveAs(false)} className="py-2 px-4 rounded-md text-sm text-gray-300 hover:bg-white/10">Cancel</button>
                                    <button onClick={handleSaveAs} disabled={!newPath.trim()} className="flex items-center gap-2 bg-[var(--neon-green)] hover:brightness-125 disabled:bg-gray-600 text-black font-bold py-2 px-4 rounded-md text-sm">
                                        <SaveIcon className="h-4 w-4" /> Save New File
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-[var(--card-border)]">
                                <button
                                    onClick={() => setShowSaveAs(true)}
                                    disabled={!canSaveAs}
                                    className="flex items-center justify-center gap-2 bg-black/40 hover:bg-black/60 disabled:bg-gray-700 disabled:cursor-not-allowed disabled:text-gray-500 text-gray-200 font-bold py-2 px-4 rounded-md text-sm transition-colors"
                                    title={canSaveAs ? "Save the new HTML content to a different file" : "Only available for single .html file changes"}
                                >
                                    <SaveIcon className="h-4 w-4" /> Save As...
                                </button>
                                <button onClick={handleApply} className="flex items-center justify-center gap-2 bg-[var(--neon-green)] hover:brightness-125 text-black font-bold py-2 px-4 rounded-md text-sm">
                                    <CheckIcon className="h-4 w-4" /> Apply & Preview Changes
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default ApplyChangesModal;