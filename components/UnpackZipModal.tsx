import React, { useState, useEffect } from 'react';
import { XIcon, FolderIcon } from './Icons';

interface UnpackZipModalProps {
  isOpen: boolean;
  fileName: string;
  onClose: () => void;
  onUnpack: (destination: string) => void;
}

const UnpackZipModal: React.FC<UnpackZipModalProps> = ({ isOpen, fileName, onClose, onUnpack }) => {
    const [destination, setDestination] = useState('');

    useEffect(() => {
        if (fileName) {
            const suggestedDir = fileName.replace(/\.zip$/i, '');
            setDestination(`/${suggestedDir}`);
        }
    }, [fileName]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (destination.trim()) {
            onUnpack(destination.trim());
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center" onClick={onClose}></div>
            <form onSubmit={handleSubmit} className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in" aria-modal="true" role="dialog">
                <div className="bg-[var(--card-bg)] backdrop-blur-xl border border-[var(--neon-purple)] rounded-2xl shadow-2xl neon-glow-purple w-full max-w-md">
                    <div className="flex items-center justify-between p-4 bg-black/30 border-b border-[var(--card-border)]">
                        <h2 className="text-lg font-bold text-[var(--neon-pink)]">Unpack Archive</h2>
                        <button type="button" onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-md text-gray-300" title="Close">
                            <XIcon className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="p-6 space-y-4">
                        <p className="text-sm text-gray-300">
                            Unpacking <span className="font-semibold text-white font-mono">{fileName}</span>.
                            Please specify a destination directory.
                        </p>
                        <div>
                            <label htmlFor="destination-path" className="block text-sm font-semibold text-gray-300 mb-1">Destination Directory</label>
                            <input
                                id="destination-path"
                                type="text"
                                value={destination}
                                onChange={(e) => setDestination(e.target.value)}
                                className="w-full p-2 bg-black/30 border border-[var(--card-border)] rounded-md focus:ring-2 focus:ring-[var(--neon-blue)] focus:outline-none transition font-mono"
                                placeholder="/my-new-project"
                                required
                            />
                        </div>
                    </div>
                    <div className="flex justify-end p-4 bg-black/30 border-t border-[var(--card-border)]">
                        <button type="submit" className="flex items-center gap-2 bg-[var(--neon-green)] hover:brightness-125 disabled:bg-gray-600 text-black font-bold py-2 px-4 rounded-md text-sm">
                            <FolderIcon className="h-5 w-5" /> Unpack Files
                        </button>
                    </div>
                </div>
            </form>
        </>
    );
};

export default UnpackZipModal;