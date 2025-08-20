import React, { useState, useMemo, useEffect } from 'react';
import type { FileSystemState, Container, Handover, TerminalLine } from '../types';
import { CpuIcon } from './Icons';
import CreateContainerModal from './CreateContainerModal';
import ContainerCard from './ContainerCard';

interface SystemOperatorPanelProps {
  fileSystem: FileSystemState;
  onUpdateFileSystem: (newFs: FileSystemState, snapshot: boolean) => void;
  onRunCommand: (command: string) => void;
  onDebug: (context: string) => void;
}

const SystemOperatorPanel: React.FC<SystemOperatorPanelProps> = ({ fileSystem, onUpdateFileSystem, onRunCommand, onDebug }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [containers, setContainers] = useState<Container[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeCommand, setActiveCommand] = useState<string | null>(null);

    useEffect(() => {
        const foundContainers: Container[] = [];
        for (const path in fileSystem) {
            if (path.endsWith('/handover.json')) {
                try {
                    const handover: Handover = JSON.parse(fileSystem[path]);
                    foundContainers.push({
                        id: handover.container_id,
                        path: path.substring(0, path.lastIndexOf('/')),
                        handover,
                    });
                } catch (e) {
                    console.error(`Failed to parse handover.json at ${path}`, e);
                }
            }
        }
        setContainers(foundContainers.sort((a, b) => new Date(b.handover.created_at).getTime() - new Date(a.handover.created_at).getTime()));
    }, [fileSystem]);

    const handleCreateContainer = (newFiles: Record<string, string>) => {
        onUpdateFileSystem({ ...fileSystem, ...newFiles }, true);
    };
    
    const handleRunCommand = async (command: string, cwd: string, containerId: string, action: 'command' | 'debug') => {
        setActiveCommand(`${command}-${containerId}`);
        setIsLoading(true);

        const handoverPath = `${cwd}/handover.json`;
        const handover: Handover = JSON.parse(fileSystem[handoverPath]);

        // Optimistically update status
        if (command === 'npm install') handover.status = 'installing';
        if (command === 'npm run build') handover.status = 'building';
        if (command === 'npm start') handover.status = 'running';
        
        const tempFs = { ...fileSystem, [handoverPath]: JSON.stringify(handover, null, 2) };
        onUpdateFileSystem(tempFs, false);

        await onRunCommand(`${command} --prefix ${cwd}`); // We'll need to parse this in the terminal logic, for now it's a hint
        
        // This is a simulation, so we assume success for now.
        // A real implementation would get the result from the terminal.
        handover.history.push({
            action,
            by: handover.operator,
            at: new Date().toISOString(),
            details: { command, status: 'success' }
        });
        handover.status = 'running'; // Or based on result
        const finalFs = { ...fileSystem, [handoverPath]: JSON.stringify(handover, null, 2) };
        onUpdateFileSystem(finalFs, true);
        
        setIsLoading(false);
        setActiveCommand(null);
    };

    return (
        <div className="space-y-4">
            <button
                onClick={() => setIsModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 bg-[var(--neon-green)] hover:brightness-125 text-black font-bold py-2 px-3 rounded-md transition-all"
            >
                <CpuIcon className="h-5 w-5" />
                <span>Create New Container</span>
            </button>
            
            <div className="space-y-3">
                {containers.length === 0 ? (
                    <p className="text-xs text-center text-gray-400 p-4 bg-black/20 rounded-md">No containers found. Create one to get started!</p>
                ) : (
                    containers.map(container => (
                        <ContainerCard 
                            key={container.id} 
                            container={container} 
                            onRunCommand={handleRunCommand}
                            onDebug={onDebug}
                            isLoading={isLoading}
                            activeCommand={activeCommand}
                        />
                    ))
                )}
            </div>

            <CreateContainerModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                fileSystem={fileSystem}
                onCreateContainer={handleCreateContainer}
            />
        </div>
    );
};

export default SystemOperatorPanel;
