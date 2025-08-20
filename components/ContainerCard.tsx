import React, { useState } from 'react';
import type { Container, HandoverHistoryItem } from '../types';
import { CpuIcon, PlayIcon, TerminalIcon, CheckIcon, XIcon, SpinnerIcon, KeyIcon } from './Icons';

interface ContainerCardProps {
  container: Container;
  onRunCommand: (command: string, cwd: string, containerId: string, action: HandoverHistoryItem['action']) => void;
  onDebug: (context: string) => void;
  isLoading: boolean;
  activeCommand: string | null;
}

const buttonStyle = "flex items-center justify-center gap-2 text-xs bg-black/30 hover:bg-black/40 disabled:bg-black/20 disabled:text-gray-500 disabled:cursor-not-allowed text-gray-200 font-semibold py-1.5 px-3 rounded-md transition-colors";

const ContainerCard: React.FC<ContainerCardProps> = ({ container, onRunCommand, onDebug, isLoading, activeCommand }) => {
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const { handover } = container;
    const envVars = handover.env ? Object.entries(handover.env) : [];

    const isActionRunning = (action: string) => isLoading && activeCommand === `${action}-${container.id}`;

    const renderStatusIcon = (status: HandoverHistoryItem['details']['status']) => {
        if (status === 'success') return <CheckIcon className="h-4 w-4 text-green-400" />;
        if (status === 'failure') return <XIcon className="h-4 w-4 text-red-500" />;
        return null;
    };

    return (
        <div className="bg-black/20 rounded-lg border border-[var(--card-border)] text-sm">
            <div className="p-3">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="font-bold text-white">{handover.operator}</p>
                        <p className="text-xs text-gray-400 font-mono" title={container.id}>{container.id.split('-')[0]}</p>
                    </div>
                    <div className={`px-2 py-1 text-xs rounded-full font-semibold ${
                        handover.status === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                    }`}>
                        {handover.status}
                    </div>
                </div>
                <p className="text-xs text-gray-300 mt-2 italic">"{handover.prompt}"</p>
                 {envVars.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-white/10">
                        <p className="text-xs font-semibold text-gray-400 mb-1">Environment:</p>
                        {envVars.map(([key]) => (
                            <div key={key} className="flex items-center gap-2 text-xs font-mono text-gray-300">
                                <KeyIcon className="h-3 w-3 text-yellow-400" />
                                <span>{key}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div className="flex items-center justify-end gap-2 p-2 border-t border-[var(--card-border)] bg-black/10">
                <button 
                    onClick={() => onRunCommand('npm install', container.path, container.id, 'command')}
                    disabled={isLoading}
                    className={buttonStyle}
                    title="Simulate npm install"
                >
                    {isActionRunning('npm install') ? <SpinnerIcon className="h-4 w-4 animate-spin"/> : <TerminalIcon className="h-4 w-4" />}
                    <span>Install</span>
                </button>
                 <button 
                    onClick={() => onRunCommand('npm run build', container.path, container.id, 'command')}
                    disabled={isLoading}
                    className={buttonStyle}
                    title="Simulate npm run build"
                >
                     {isActionRunning('npm run build') ? <SpinnerIcon className="h-4 w-4 animate-spin"/> : <CpuIcon className="h-4 w-4" />}
                    <span>Build</span>
                </button>
                 <button 
                    onClick={() => onRunCommand('npm start', container.path, container.id, 'command')}
                    disabled={isLoading}
                    className={buttonStyle}
                    title="Simulate npm start"
                >
                    {isActionRunning('npm start') ? <SpinnerIcon className="h-4 w-4 animate-spin"/> : <PlayIcon className="h-4 w-4" />}
                    <span>Start</span>
                </button>
            </div>
             <div className="border-t border-[var(--card-border)]">
                <button onClick={() => setIsHistoryOpen(p => !p)} className="w-full text-left p-2 text-xs text-gray-400 hover:bg-black/20">
                    {isHistoryOpen ? 'Hide' : 'Show'} Build History ({handover.history.length})
                </button>
                {isHistoryOpen && (
                    <div className="p-3 border-t border-black/20 text-xs font-mono max-h-40 overflow-y-auto">
                        {handover.history.map((item, index) => (
                            <div key={index} className="flex items-start gap-3 py-1">
                                {renderStatusIcon(item.details.status)}
                                <div>
                                    <p className="text-gray-300">
                                        <span className="font-semibold text-cyan-400">{item.action}:</span> {item.details.command || item.action}
                                    </p>
                                    <p className="text-gray-500">{new Date(item.at).toLocaleString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ContainerCard;