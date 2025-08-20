import React, { useState, useMemo } from 'react';
import { XIcon, CpuIcon } from './Icons';
import type { FileSystemState, TemplateRegistry, Handover, TemplateInfo } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface CreateContainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileSystem: FileSystemState;
  onCreateContainer: (newFiles: Record<string, string>) => void;
}

const labelStyle = "block text-sm font-semibold text-gray-300 mb-1";
const inputStyle = "w-full p-2 bg-black/30 border border-[var(--card-border)] rounded-md focus:ring-2 focus:ring-[var(--neon-blue)] focus:outline-none transition";
const selectStyle = `${inputStyle} appearance-none`;


const CreateContainerModal: React.FC<CreateContainerModalProps> = ({ isOpen, onClose, fileSystem, onCreateContainer }) => {
    const [operator, setOperator] = useState('operator');
    const [prompt, setPrompt] = useState('');
    const [baseTemplate, setBaseTemplate] = useState('');
    const [uiTemplate, setUiTemplate] = useState('');
    const [datastoreTemplate, setDatastoreTemplate] = useState('');
    const [apiName, setApiName] = useState('');
    const [apiKey, setApiKey] = useState('');

    const registry = useMemo((): TemplateRegistry | null => {
        try {
            const registryContent = fileSystem['/templates/registry.json'];
            // Guard against undefined or non-string values which cause JSON.parse to throw.
            if (typeof registryContent !== 'string') {
                return null;
            }
            return JSON.parse(registryContent);
        } catch (e) {
            console.error("Failed to parse registry.json", e);
            return null;
        }
    }, [fileSystem]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!registry || !baseTemplate) {
            alert("Please select a base template.");
            return;
        }

        const containerId = `container_${uuidv4()}`;
        const containerPath = `/containers/${containerId}`;
        const newFiles: Record<string, string> = {};

        // 1. Collect all template paths to copy from
        const templatesToCopy: { name: string, info: TemplateInfo }[] = [];
        if (baseTemplate) templatesToCopy.push({ name: baseTemplate, info: registry.TEMPLATES[baseTemplate] });
        if (uiTemplate) templatesToCopy.push({ name: uiTemplate, info: registry.UI[uiTemplate] });
        if (datastoreTemplate) templatesToCopy.push({ name: datastoreTemplate, info: registry.DATASTORE[datastoreTemplate]});

        // 2. Copy files from selected templates
        for (const { info } of templatesToCopy) {
            const templatePath = info.path;
            const templateFiles = Object.keys(fileSystem).filter(p => p.startsWith(templatePath) && p !== templatePath);
            
            for (const filePath of templateFiles) {
                const relativePath = filePath.substring(templatePath.length);
                const destPath = `${containerPath}${relativePath}`;
                newFiles[destPath] = fileSystem[filePath];
            }
        }

        // 3. Create handover.json
        const now = new Date().toISOString();
        const env: { [key: string]: string } = {};
        if (apiName.trim() && apiKey.trim()) {
            env[apiName.trim()] = apiKey.trim();
        }
        
        const newHandover: Handover = {
            container_id: containerId,
            operator,
            prompt,
            chosen_templates: {
                base: baseTemplate,
                ui: uiTemplate ? [uiTemplate] : [],
                datastore: datastoreTemplate,
            },
            env: Object.keys(env).length > 0 ? env : undefined,
            status: 'initialized',
            created_at: now,
            history: [{
                action: 'create',
                by: operator,
                at: now,
                details: {
                    prompt,
                    base: baseTemplate,
                    ui: uiTemplate,
                    datastore: datastoreTemplate,
                    env: Object.keys(env).length > 0 ? env : undefined,
                }
            }]
        };
        newFiles[`${containerPath}/handover.json`] = JSON.stringify(newHandover, null, 2);

        // 4. Create placeholder for dist folder
        newFiles[`${containerPath}/dist/.placeholder`] = '';

        onCreateContainer(newFiles);
        onClose();
        // Reset form
        setPrompt('');
        setBaseTemplate('');
        setUiTemplate('');
        setDatastoreTemplate('');
        setApiName('');
        setApiKey('');
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center" onClick={onClose}></div>
            <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in" aria-modal="true" role="dialog">
                <form onSubmit={handleSubmit} className="bg-[var(--card-bg)] backdrop-blur-xl border border-[var(--neon-purple)] rounded-2xl shadow-2xl neon-glow-purple w-full max-w-lg">
                    <div className="flex items-center justify-between p-4 bg-black/30 border-b border-[var(--card-border)]">
                        <h2 className="text-lg font-bold text-[var(--neon-pink)]">Create New Container</h2>
                        <button type="button" onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-md text-gray-300" title="Close">
                            <XIcon className="h-5 w-5" />
                        </button>
                    </div>

                    {!registry ? (
                        <div className="p-6 text-center text-red-400">
                            Error: Could not load `/templates/registry.json`.
                        </div>
                    ) : (
                        <div className="p-6 space-y-4">
                            <div>
                                <label htmlFor="operator-name" className={labelStyle}>Operator Name</label>
                                <input id="operator-name" type="text" value={operator} onChange={e => setOperator(e.target.value)} className={inputStyle} required />
                            </div>
                             <div>
                                <label htmlFor="prompt" className={labelStyle}>Describe your goal</label>
                                <textarea id="prompt" value={prompt} onChange={e => setPrompt(e.target.value)} className={inputStyle} rows={2} placeholder="e.g., A simple to-do application" required />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="base-template" className={labelStyle}>Base Template *</label>
                                    <select id="base-template" value={baseTemplate} onChange={e => setBaseTemplate(e.target.value)} className={selectStyle} required>
                                        <option value="">Select Base...</option>
                                        {Object.keys(registry.TEMPLATES).map(key => <option key={key} value={key}>{key}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="ui-template" className={labelStyle}>UI Framework</label>
                                    <select id="ui-template" value={uiTemplate} onChange={e => setUiTemplate(e.target.value)} className={selectStyle}>
                                        <option value="">Select UI...</option>
                                        {Object.keys(registry.UI).map(key => <option key={key} value={key}>{key}</option>)}
                                    </select>
                                </div>
                            </div>
                             <div>
                                <label htmlFor="datastore-template" className={labelStyle}>Datastore</label>
                                <select id="datastore-template" value={datastoreTemplate} onChange={e => setDatastoreTemplate(e.target.value)} className={selectStyle}>
                                    <option value="">Select Datastore...</option>
                                    {Object.keys(registry.DATASTORE).map(key => <option key={key} value={key}>{key}</option>)}
                                </select>
                            </div>
                            <div className="pt-4 border-t border-[var(--card-border)]">
                                <h3 className="text-base font-semibold text-gray-300 mb-2">Environment Variables (Optional)</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="api-name" className={labelStyle}>API Name</label>
                                        <input id="api-name" type="text" value={apiName} onChange={e => setApiName(e.target.value)} className={inputStyle} placeholder="e.g., OPENAI_API_KEY" />
                                    </div>
                                    <div>
                                        <label htmlFor="api-key" className={labelStyle}>API Key</label>
                                        <input id="api-key" type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} className={inputStyle} placeholder="Enter secret key" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <div className="flex justify-end p-4 bg-black/30 border-t border-[var(--card-border)]">
                        <button type="submit" disabled={!registry} className="flex items-center gap-2 bg-[var(--neon-green)] hover:brightness-125 disabled:bg-gray-600 text-black font-bold py-2 px-4 rounded-md text-sm">
                            <CpuIcon className="h-5 w-5" /> Create Container
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
};

export default CreateContainerModal;