import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';
import type { FileSystemState, ChatMessage, TerminalLine, GithubUser, GithubRepo, GithubBranch, FileChange } from './types';
import dbService from './services/dbService';
import { initialFileSystem, readmeContent, templateRegistry } from './constants';

export interface StoreState {
    // Core State
    isDBLoading: boolean;
    fileSystem: FileSystemState;
    chatHistory: ChatMessage[];
    terminalHistory: TerminalLine[];
    terminalCwd: string;
    lastSavedTimestamp: Date | null;
    error: string;

    // UI State
    panelSizes: number[];
    previewRoot: string | null;
    openFiles: string[];
    activeFile: string | null;
    chatPanelHeight: number;

    // Undo/Redo State
    fileSystemHistory: FileSystemState[];
    currentHistoryIndex: number;
    
    // GitHub State
    githubToken: string;
    isGithubConnected: boolean;
    githubUser: GithubUser | null;
    githubRepos: GithubRepo[];
    selectedRepoFullName: string;
    repoBranches: GithubBranch[];
    selectedBranchName: string;
    isLoadingFromGithub: boolean;
    initialGithubFileSystem: FileSystemState | null;
    changedFiles: FileChange[];

    // Actions
    loadStateFromDB: () => Promise<void>;
    saveState: () => Promise<void>;
    setFileSystem: (fs: FileSystemState, snapshot?: boolean) => void;
    setChatHistory: (history: ChatMessage[]) => void;
    addChatMessage: (message: ChatMessage) => void;
    setTerminalHistory: (history: TerminalLine[]) => void;
    addTerminalLine: (line: TerminalLine) => void;
    updateTerminalLine: (line: Partial<TerminalLine> & { id: string }) => void;
    setTerminalCwd: (cwd: string) => void;
    setError: (error: string) => void;
    setPanelSizes: (sizes: number[]) => void;
    setPreviewRoot: (root: string | null) => void;
    setOpenFiles: (files: string[]) => void;
    setActiveFile: (file: string | null) => void;
    setChatPanelHeight: (height: number) => void;
    
    // Undo/Redo Actions
    undo: () => void;
    redo: () => void;
    
    // GitHub Actions
    setGithubToken: (token: string) => void;
    setGithubState: (state: Partial<Pick<StoreState, 'isGithubConnected' | 'githubUser' | 'githubRepos' | 'selectedRepoFullName' | 'repoBranches' | 'selectedBranchName' | 'initialGithubFileSystem' | 'changedFiles' | 'isLoadingFromGithub'>>) => void;

    // Derived State (as getters)
    canUndo: () => boolean;
    canRedo: () => boolean;
}

const useStore = create<StoreState>()(subscribeWithSelector((set, get) => ({
    // Initial State
    isDBLoading: true,
    fileSystem: {},
    chatHistory: [],
    terminalHistory: [],
    terminalCwd: '/',
    lastSavedTimestamp: null,
    error: '',
    panelSizes: [25, 40, 35],
    previewRoot: '/',
    openFiles: [],
    activeFile: null,
    chatPanelHeight: 250,
    fileSystemHistory: [],
    currentHistoryIndex: -1,
    githubToken: '',
    isGithubConnected: false,
    githubUser: null,
    githubRepos: [],
    selectedRepoFullName: '',
    repoBranches: [],
    selectedBranchName: '',
    isLoadingFromGithub: false,
    initialGithubFileSystem: null,
    changedFiles: [],

    // Actions
    loadStateFromDB: async () => {
        await dbService.initDB();
        const savedState = await dbService.loadState();
        if (savedState) {
            const loadedFs = savedState.fileSystem || initialFileSystem;
            loadedFs['/README.md'] = readmeContent; // Ensure latest README
            loadedFs['/templates/registry.json'] = templateRegistry; // Ensure latest registry
            
            set({
                chatHistory: savedState.chatHistory || [{role: 'system', content: 'Session restored.'}],
                fileSystem: loadedFs,
                panelSizes: savedState.panelSizes || [25, 40, 35],
                previewRoot: savedState.previewRoot || '/',
                openFiles: savedState.openFiles || ['/README.md', '/index.html'],
                activeFile: savedState.activeFile || '/README.md',
                chatPanelHeight: savedState.chatPanelHeight || 250,
                githubToken: savedState.githubToken || '',
                terminalHistory: savedState.terminalHistory || [],
                terminalCwd: savedState.terminalCwd || '/',
                lastSavedTimestamp: savedState.lastSavedTimestamp ? new Date(savedState.lastSavedTimestamp) : null,
                fileSystemHistory: [loadedFs],
                currentHistoryIndex: 0,
                isDBLoading: false,
            });
        } else {
            set({
                fileSystem: initialFileSystem,
                openFiles: ['/README.md', '/index.html'],
                activeFile: '/README.md',
                chatHistory: [{ role: 'system', content: `Welcome to the sandbox! I'm Lyra, your AI agent. Ask me to build something or try one of the suggestions.` }],
                fileSystemHistory: [initialFileSystem],
                currentHistoryIndex: 0,
                isDBLoading: false,
            });
        }
    },
    saveState: async () => {
        const state = get();
        if (state.isDBLoading) return;
        try {
            const timestamp = new Date();
            const stateToSave = {
                chatHistory: state.chatHistory,
                fileSystem: state.fileSystem,
                panelSizes: state.panelSizes,
                previewRoot: state.previewRoot,
                openFiles: state.openFiles,
                activeFile: state.activeFile,
                chatPanelHeight: state.chatPanelHeight,
                githubToken: state.githubToken,
                terminalHistory: state.terminalHistory,
                terminalCwd: state.terminalCwd,
                lastSavedTimestamp: timestamp,
            };
            
            for (const [key, value] of Object.entries(stateToSave)) {
                await dbService.saveItem(key, value as any);
            }
            set({ lastSavedTimestamp: timestamp });
        } catch (error) {
            console.error("Failed to save state:", error);
            set({ error: "Could not save session. Changes may be lost." });
        }
    },
    setFileSystem: (fs: FileSystemState, snapshot = true) => {
        if (snapshot) {
            set(state => {
                const newHistory = state.fileSystemHistory.slice(0, state.currentHistoryIndex + 1);
                newHistory.push(fs);
                return {
                    fileSystem: fs,
                    fileSystemHistory: newHistory,
                    currentHistoryIndex: newHistory.length - 1,
                };
            });
        } else {
            set({ fileSystem: fs });
        }
    },
    setChatHistory: (history: ChatMessage[]) => set({ chatHistory: history }),
    addChatMessage: (message: ChatMessage) => set(state => ({ chatHistory: [...state.chatHistory, message] })),
    setTerminalHistory: (history: TerminalLine[]) => set({ terminalHistory: history }),
    addTerminalLine: (line: TerminalLine) => set(state => ({ terminalHistory: [...state.terminalHistory, line] })),
    updateTerminalLine: (lineUpdate: Partial<TerminalLine> & { id: string }) => set(state => ({
        terminalHistory: state.terminalHistory.map(line => line.id === lineUpdate.id ? { ...line, ...lineUpdate } : line)
    })),
    setTerminalCwd: (cwd: string) => set({ terminalCwd: cwd }),
    setError: (error: string) => set({ error }),
    setPanelSizes: (sizes: number[]) => set({ panelSizes: sizes }),
    setPreviewRoot: (root: string | null) => set({ previewRoot: root }),
    setOpenFiles: (files: string[]) => set({ openFiles: files }),
    setActiveFile: (file: string | null) => set({ activeFile: file }),
    setChatPanelHeight: (height: number) => set({ chatPanelHeight: height }),
    
    // Undo/Redo Actions
    undo: () => {
        set(state => {
            if (state.currentHistoryIndex > 0) {
                const newIndex = state.currentHistoryIndex - 1;
                return {
                    fileSystem: state.fileSystemHistory[newIndex],
                    currentHistoryIndex: newIndex,
                };
            }
            return {};
        });
    },
    redo: () => {
        set(state => {
            if (state.currentHistoryIndex < state.fileSystemHistory.length - 1) {
                const newIndex = state.currentHistoryIndex + 1;
                return {
                    fileSystem: state.fileSystemHistory[newIndex],
                    currentHistoryIndex: newIndex,
                };
            }
            return {};
        });
    },
    
    // GitHub Actions
    setGithubToken: (token: string) => set({ githubToken: token }),
    setGithubState: (newState) => set(newState),

    // Derived State
    canUndo: () => get().currentHistoryIndex > 0,
    canRedo: () => get().currentHistoryIndex < get().fileSystemHistory.length - 1,
})));

// Debounced auto-saving logic
const debounce = (func: (...args: any[]) => void, delay: number) => {
    let timeout: ReturnType<typeof setTimeout>;
    return (...args: any[]) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
};

const debouncedSave = debounce(() => {
    useStore.getState().saveState();
}, 2000);

// Subscribe to state changes for auto-saving
useStore.subscribe(
    state => [
        state.fileSystem, 
        state.chatHistory,
        state.terminalHistory,
        state.terminalCwd,
        state.panelSizes,
        state.previewRoot,
        state.openFiles,
        state.activeFile,
        state.chatPanelHeight,
        state.githubToken,
    ],
    () => {
        if (!useStore.getState().isDBLoading) {
            debouncedSave();
        }
    },
    { equalityFn: shallow }
);

// This will trigger the calculation of changed files whenever the file system or the initial github fs changes.
useStore.subscribe(
    state => [state.fileSystem, state.initialGithubFileSystem],
    ([fileSystem, initialGithubFileSystem]) => {
        if (!initialGithubFileSystem) {
            useStore.getState().setGithubState({ changedFiles: [] });
            return;
        }
        const changes: FileChange[] = [];
        const allPaths = new Set([...Object.keys(initialGithubFileSystem), ...Object.keys(fileSystem)]);
        
        allPaths.forEach(path => {
            const initialContent = initialGithubFileSystem[path];
            const currentContent = fileSystem[path];

            if (initialContent === undefined && currentContent !== undefined) {
                changes.push({ path, status: 'added' });
            } else if (initialContent !== undefined && currentContent === undefined) {
                changes.push({ path, status: 'deleted' });
            } else if (initialContent !== currentContent) {
                changes.push({ path, status: 'modified' });
            }
        });

        useStore.getState().setGithubState({ changedFiles: changes.filter(c => !c.path.endsWith('/.placeholder')) });
    },
    { equalityFn: shallow }
);


export default useStore;
