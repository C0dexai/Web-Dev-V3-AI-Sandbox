import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { chatWithAgent, refineCodeWithAgent, getAiHint, runCommandInTerminal } from '../services/geminiService';
import * as githubService from '../services/githubService';
import type { FileSystemState, ChatMessage, GithubRepo, GithubBranch, GithubUser, FileChange, TerminalLine, Container } from '../types';
import { SpinnerIcon, MagicWandIcon, LightbulbIcon, XIcon, DocumentTextIcon, GeminiIcon, MaximizeIcon, MinimizeIcon, ChevronDownIcon, ChevronUpIcon, GithubIcon, CodeIcon, TerminalIcon, CpuIcon } from './Icons';
import CollapsibleSection from './CollapsibleSection';
import ChatMessageView from './ChatMessage';
import FileExplorer from './FileExplorer';
import CodeEditor from './CodePreview';
import SystemOperatorPanel from './SystemOperatorPanel';
import Terminal from './Terminal';
import { marked } from 'marked';
import { v4 as uuidv4 } from 'uuid';
import JSZip, { type JSZipObject } from 'jszip';
import dbService from '../services/dbService';
import OrbMenu from './OrbMenu';
import GithubPanel from './GithubPanel';
import InlineEditor from './InlineEditor';
import ApplyChangesModal from './ApplyChangesModal';
import UnpackZipModal from './UnpackZipModal';


const readmeContent = `# Live Web Dev Sandbox with Gemini AI & GitHub Integration

This is a powerful, browser-based development environment that combines the creative power of the Google Gemini AI with the version control capabilities of GitHub. It allows you to generate, edit, and manage full web projects using natural language, and then commit your work directly to a repository.

---

## Key Features

-   **System Operator Build Process**: Orchestrate entire project builds from a registry of templates (React, Tailwind, etc.). Each build is a "container" with its own state and history.
-   **AI-Powered Development**: Instruct the Gemini agent to create files, write HTML, style with CSS/TailwindCSS, and add JavaScript functionality.
-   **Full GitHub Integration**: Connect your GitHub account, load repositories, browse branches, and commit & push changes directly from the app.
-   **Simulated WebContainer Terminal**: An AI-powered terminal that understands common shell commands (\`ls\`, \`cd\`, \`npm install\`, \`npm run build\`) to orchestrate project changes.
-   **Live Preview & Editing**: See your changes reflected instantly. Click on elements to edit them directly in the preview.
-   **Complete File Management**: A familiar file explorer with support for creating files/folders, uploading (including ZIP archives), and downloading your entire project.

---

## First Run & Quick Start

1.  **Connect to GitHub (Optional but Recommended)**:
    *   Go to the "GitHub" panel on the left.
    *   Enter a [GitHub Personal Access Token (PAT)](https://github.com/settings/tokens?type=beta) with \`repo\` scope. **Your token is stored securely in your browser's local storage and is never exposed.**
    *   Click "Connect" to load your repositories.

2.  **Create a Project Container**:
    *   Go to the "System Operator" panel on the left.
    *   Click "Create New Container".
    *   Give your operator a name, describe your goal (e.g., "A simple todo app"), and select your templates (e.g., React, Tailwind).
    *   Click "Create Container". This will create a new project in the \`/containers/\` directory.

3.  **Build Your Project**:
    *   In the new container's card, click **Install** to simulate \`npm install\`.
    *   Then click **Build** to simulate \`npm run build\`.
    *   Set the container's directory (e.g., \`/containers/container_xyz/\`) as the **Preview Root** in the File Explorer to see it live.

4.  **Interact with the AI Agent**:
    *   Use the "Inference" chat panel at the top. Type a command like:
        > "In my new React container, add a button to the App component with the text 'Click Me'."
    *   The agent will reply, explain its work, and show you the proposed code changes. Click **"Apply Code Changes"** to accept them.
    *   Use the suggested follow-up actions that appear under the AI's response for a guided experience.

5.  **Commit Your Work**:
    *   Once connected to GitHub and your project is loaded, the "Source Control" section will show all your changes.
    *   Write a commit message (e.g., "feat: Add new call-to-action button").
    *   Click **"Commit & Push"**. Your changes are now live on GitHub!

---

## Feature Deep Dive

### The System Operator Panel

This is the central hub for managing your projects.

-   **Containers**: Each project is a self-contained unit. The file system, dependencies (\`package.json\`), and build history (\`handover.json\`) are stored within its directory in \`/containers/\`.
-   **Template Registry**: The build process uses a file-based registry located in the \`/templates\` directory. The AI is aware of \`/templates/registry.json\` and can use it to assemble new projects based on your requests. You can extend the system by adding new templates to this directory.
-   **Build Commands**: The \`Install\`, \`Build\`, and \`Start\` buttons use the AI-powered terminal to simulate the respective \`npm\` commands, updating the file system and logging the results in the container's \`handover.json\`.

### The Simulated Terminal (WebContainer)

The "Terminal" tab provides a command-line interface powered by a Gemini agent.

-   **How it works**: When you run a command like \`npm run build\`, the command is sent to the Gemini agent. The agent reads the project files (like \`package.json\` and \`vite.config.js\`), understands what the build process would do, and returns a *simulated* output, including creating a \`/dist\` directory.
-   **What it's for**: It's a powerful tool for AI-driven orchestration. It allows the System Operator panel and the chat agent to manage project structure and dependencies without a real execution environment.
-   **Limitations**: It does **not** actually execute code, run a live server, or access the network. It's a high-level simulation.
`;

const systemOperatorReadme = `# 🛠️ SYSTEM OPERATOR BUILD PROCESS

This document outlines the architecture and workflow for the System Operator feature, which enables building and orchestrating applications from a template registry.

## 1. Directory Structure

- \`/templates\`: Contains a static registry of building blocks for projects (e.g., React, Tailwind).
  - \`registry.json\`: A lookup table describing all available templates.
- \`/containers\`: Holds dynamic, Operator-created builds. Each container is a self-contained project.
  - \`container_<id>/\`: A specific project instance.
    - \`handover.json\`: A log file containing the build history, commands, and metadata for the container.

## 2. Build Orchestration Flow

1.  **Prompt / Operator Choice**: The operator initiates a build via the UI, selecting templates from the registry.
2.  **Container Creation**: A new folder is created in \`/containers\`, and the files from the chosen templates are copied into it. A \`handover.json\` file is generated to track the build.
3.  **History Logging**: Every command (e.g., \`npm install\`, \`npm run build\`) is logged to \`handover.json\` with a timestamp and status. This provides a debuggable history for each container.
4.  **Debugging**: If a command fails, the "Debug" feature can be used. It sends the error logs and \`handover.json\` context to the AI agent for analysis and suggestions.
`;

const templateRegistry = `{
  "TEMPLATES": {
    "REACT": { "path": "/templates/react-vite", "tags": ["spa", "frontend", "vite"] },
    "VANILLA": { "path": "/templates/vanilla", "tags": ["basic", "javascript"] }
  },
  "UI": {
    "TAILWIND": { "path": "/templates/tailwind-css", "tags": ["styles", "utility-css"] }
  },
  "DATASTORE": {
    "IndexedDB": { "path": "/templates/datastore/indexeddb", "tags": ["local", "browser-db"] }
  }
}`;

const initialFileSystem: FileSystemState = {
  // Main documentation
  '/README.md': readmeContent,
  '/SYSTEM_OPERATOR_BUILD_PROCESS.md': systemOperatorReadme,

  // Base project structure
  '/index.html': '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>My Sandbox</title>\n  <link rel="stylesheet" href="/style.css">\n  <script src="https://cdn.tailwindcss.com"></script>\n</head>\n<body>\n  <h1 class="text-3xl font-bold text-center mt-8" data-editable-id="e7a78e4a-58f7-4a7c-b5f3-4d7a7d3e6e8e">Welcome to your Live Sandbox!</h1>\n  <p class="text-center" data-editable-id="b7a78e4a-58f7-4a7c-b5f3-4d7a7d3e6e8f">Click on an element to edit its code directly in the preview.</p>\n  <script src="/script.js"></script>\n</body>\n</html>',
  '/style.css': 'body { \n  font-family: sans-serif;\n  background-color: #111827; /* A default dark theme */\n  color: #E5E7EB; /* Default light text on dark background */\n}',
  '/script.js': '// JavaScript goes here',

  // System Operator Directories
  '/containers/.placeholder': '',
  '/templates/registry.json': templateRegistry,
  '/templates/README.md': 'This directory contains all the building block templates for the System Operator. You can add your own templates here and reference them in `registry.json`.',

  // Template: React + Vite
  '/templates/react-vite/package.json': JSON.stringify({
    "name": "react-vite-template", "version": "1.0.0", "type": "module",
    "scripts": { "dev": "vite", "build": "vite build", "start": "vite" },
    "dependencies": { "react": "^18.2.0", "react-dom": "^18.2.0" },
    "devDependencies": { "@vitejs/plugin-react": "^4.0.3", "vite": "^4.4.5" }
  }, null, 2),
   '/templates/react-vite/index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React Vite App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`,
  '/templates/react-vite/src/main.jsx': `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`,
  '/templates/react-vite/src/App.jsx': `function App() {
  return (
    <div>
      <h1>Hello, React + Vite!</h1>
      <p>Your app is running.</p>
    </div>
  )
}
export default App`,
  '/templates/react-vite/src/index.css': `body { margin: 0; font-family: system-ui, sans-serif; }`,

  // Template: Vanilla JS
  '/templates/vanilla/index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Vanilla JS Template</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <h1>Hello, Vanilla JS!</h1>
  <script src="script.js"></script>
</body>
</html>`,
  '/templates/vanilla/style.css': `body { background-color: #f0f0f0; }`,
  '/templates/vanilla/script.js': `console.log('Vanilla JS template loaded.');`,

  // Template: Tailwind CSS
  '/templates/tailwind-css/tailwind.config.js': `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./**/*.{html,js,jsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
}`,
  '/templates/tailwind-css/style.css': `@tailwind base;
@tailwind components;
@tailwind utilities;
`,

  // Template: IndexedDB
  '/templates/datastore/indexeddb/db.js': `// IndexedDB setup code will go here.
console.log('IndexedDB module loaded.');`,
};


// Simple path resolver
const resolvePath = (base: string, relative: string): string => {
    // Normalize base to be a directory
    const baseDir = base.endsWith('/') ? base : base.substring(0, base.lastIndexOf('/') + 1);
    const path = new URL(relative, `file://${baseDir}`).pathname;
    return path.startsWith('/') ? path : `/${path}`;
};


const getMimeType = (path: string): string => {
    const extension = path.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'html': return 'text/html';
        case 'css': return 'text/css';
        case 'js': return 'application/javascript';
        case 'json': return 'application/json';
        case 'png': return 'image/png';
        case 'jpg':
        case 'jpeg': return 'image/jpeg';
        case 'gif': return 'image/gif';
        case 'svg': return 'image/svg+xml';
        case 'md': return 'text/markdown';
        default: return 'application/octet-stream';
    }
};

interface OrchestratorPanelProps {
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
}

interface EditingElementInfo {
    id: string;
    html: string;
    position: {
        top: number;
        left: number;
    };
    selector?: string;
}


const OrchestratorPanel: React.FC<OrchestratorPanelProps> = ({ isFocusMode, onToggleFocusMode }) => {
  const [isDBLoading, setIsDBLoading] = useState(true);
  
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [cliInput, setCliInput] = useState<string>('');
  const [fileSystem, setFileSystem] = useState<FileSystemState>({});
  const [previewRoot, setPreviewRoot] = useState<string | null>('/');
  const [srcDoc, setSrcDoc] = useState('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string>('');

  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  const [panelSizes, setPanelSizes] = useState<number[]>([25, 40, 35]);
  const dragDividerIndex = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'terminal'>('editor');


  const [refineInstruction, setRefineInstruction] = useState<string>('');
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [editingElementInfo, setEditingElementInfo] = useState<EditingElementInfo | null>(null);
  
  const [aiHint, setAiHint] = useState<string>('');
  const [isHintLoading, setIsHintLoading] = useState<boolean>(false);
  
  const [chatPanelHeight, setChatPanelHeight] = useState<number>(250);
  const [isResizingChat, setIsResizingChat] = useState(false);
  const [isChatMaximized, setIsChatMaximized] = useState(false);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  
  const [fileSystemHistory, setFileSystemHistory] = useState<FileSystemState[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<Date | null>(null);

  // Terminal State
  const [terminalHistory, setTerminalHistory] = useState<TerminalLine[]>([]);
  const [terminalCwd, setTerminalCwd] = useState('/');
  const [isTerminalLoading, setIsTerminalLoading] = useState(false);

  // GitHub State
  const [githubToken, setGithubToken] = useState<string>('');
  const [isGithubConnected, setIsGithubConnected] = useState<boolean>(false);
  const [githubUser, setGithubUser] = useState<GithubUser | null>(null);
  const [githubRepos, setGithubRepos] = useState<GithubRepo[]>([]);
  const [selectedRepoFullName, setSelectedRepoFullName] = useState<string>('');
  const [repoBranches, setRepoBranches] = useState<GithubBranch[]>([]);
  const [selectedBranchName, setSelectedBranchName] = useState<string>('');
  const [isLoadingFromGithub, setIsLoadingFromGithub] = useState<boolean>(false);
  const [initialGithubFileSystem, setInitialGithubFileSystem] = useState<FileSystemState | null>(null);
  const [changedFiles, setChangedFiles] = useState<FileChange[]>([]);

  // State for the new code application modal
  const [pendingCodeChanges, setPendingCodeChanges] = useState<{ path: string; content: string }[] | null>(null);

  // State for unpacking ZIP files
  const [pendingZip, setPendingZip] = useState<{ file: File; contents: ArrayBuffer } | null>(null);

  const saveSnapshot = useCallback((fs: FileSystemState) => {
      setFileSystemHistory(prev => {
          const newHistory = prev.slice(0, currentHistoryIndex + 1);
          newHistory.push(fs);
          return newHistory;
      });
      setCurrentHistoryIndex(prev => prev + 1);
  }, [currentHistoryIndex]);

  // Load state from IndexedDB on initial render
  useEffect(() => {
    const loadStateFromDB = async () => {
        await dbService.initDB();
        const savedState = await dbService.loadState();
        if (savedState) {
            setChatHistory(savedState.chatHistory || [{role: 'system', content: 'Session restored.'}]);
            const loadedFs = savedState.fileSystem || initialFileSystem;
            loadedFs['/README.md'] = readmeContent; // Ensure latest README
            loadedFs['/templates/registry.json'] = templateRegistry; // Ensure latest registry
            setFileSystem(loadedFs);
            setPanelSizes(savedState.panelSizes || [25, 40, 35]);
            setPreviewRoot(savedState.previewRoot || '/');
            setOpenFiles(savedState.openFiles || ['/README.md', '/index.html']);
            setActiveFile(savedState.activeFile || '/README.md');
            setChatPanelHeight(savedState.chatPanelHeight || 250);
            setGithubToken(savedState.githubToken || '');
            setTerminalHistory(savedState.terminalHistory || []);
            setTerminalCwd(savedState.terminalCwd || '/');
            setLastSavedTimestamp(savedState.lastSavedTimestamp ? new Date(savedState.lastSavedTimestamp) : null);

            setFileSystemHistory([loadedFs]);
            setCurrentHistoryIndex(0);
        } else {
            setFileSystem(initialFileSystem);
            setOpenFiles(['/README.md', '/index.html']);
            setActiveFile('/README.md');
            setChatHistory([{ role: 'system', content: `Welcome to the sandbox! I'm Lyra, your AI agent. Ask me to build something or try one of the suggestions.` }]);
            setFileSystemHistory([initialFileSystem]);
            setCurrentHistoryIndex(0);
        }
        setIsDBLoading(false);
    };

    loadStateFromDB();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveState = useCallback(async () => {
    if (isDBLoading) return;
    try {
        const timestamp = new Date();
        // This is a manual save, so we save everything at once.
        await Promise.all([
            dbService.saveItem('chatHistory', chatHistory),
            dbService.saveItem('fileSystem', fileSystem),
            dbService.saveItem('panelSizes', panelSizes),
            dbService.saveItem('previewRoot', previewRoot),
            dbService.saveItem('openFiles', openFiles),
            dbService.saveItem('activeFile', activeFile),
            dbService.saveItem('chatPanelHeight', chatPanelHeight),
            dbService.saveItem('githubToken', githubToken),
            dbService.saveItem('terminalHistory', terminalHistory),
            dbService.saveItem('terminalCwd', terminalCwd),
            dbService.saveItem('lastSavedTimestamp', timestamp),
        ]);
        setLastSavedTimestamp(timestamp);
    } catch (error) {
        console.error("Failed to save state manually:", error);
        setError("Could not save session. Changes may be lost.");
    }
  }, [isDBLoading, chatHistory, fileSystem, panelSizes, previewRoot, openFiles, activeFile, chatPanelHeight, githubToken, terminalHistory, terminalCwd]);
  
  // Granular, debounced auto-saving for performance
  const updateTimestamp = useCallback(() => {
    const now = new Date();
    dbService.saveItem('lastSavedTimestamp', now);
    setLastSavedTimestamp(now);
  }, []);

  // Effect for fileSystem
  useEffect(() => {
    if (isDBLoading) return;
    const handler = setTimeout(() => {
        dbService.saveItem('fileSystem', fileSystem).then(updateTimestamp);
    }, 2000);
    return () => clearTimeout(handler);
  }, [fileSystem, isDBLoading, updateTimestamp]);

  // Effect for chatHistory
  useEffect(() => {
    if (isDBLoading) return;
    const handler = setTimeout(() => {
        dbService.saveItem('chatHistory', chatHistory).then(updateTimestamp);
    }, 2000);
    return () => clearTimeout(handler);
  }, [chatHistory, isDBLoading, updateTimestamp]);

  // Effect for terminal state
  useEffect(() => {
    if (isDBLoading) return;
    const handler = setTimeout(() => {
        dbService.saveItem('terminalHistory', terminalHistory).then(updateTimestamp);
        dbService.saveItem('terminalCwd', terminalCwd).then(updateTimestamp);
    }, 2000);
    return () => clearTimeout(handler);
  }, [terminalHistory, terminalCwd, isDBLoading, updateTimestamp]);

  // Effect for UI layout state
  const uiState = useMemo(() => ({
    panelSizes, previewRoot, openFiles, activeFile, chatPanelHeight, githubToken
  }), [panelSizes, previewRoot, openFiles, activeFile, chatPanelHeight, githubToken]);

  useEffect(() => {
    if (isDBLoading) return;
    const handler = setTimeout(() => {
        Object.entries(uiState).forEach(([key, value]) => {
            dbService.saveItem(key, value);
        });
        updateTimestamp();
    }, 2000);
    return () => clearTimeout(handler);
  }, [uiState, isDBLoading, updateTimestamp]);


  useEffect(() => {
    const handleMouseUp = () => {
        dragDividerIndex.current = null;
    };
    const handleMouseLeave = () => {
        dragDividerIndex.current = null;
    }
    
    const handleMouseMove = (e: MouseEvent) => {
        if (dragDividerIndex.current === null) return;
        
        e.preventDefault();
        const container = containerRef.current;
        if (!container) return;
    
        const rect = container.getBoundingClientRect();
        const newPanelSizes = [...panelSizes];
        
        if (dragDividerIndex.current === 0) { // dragging left divider
            const newLeftWidthPercent = ((e.clientX - rect.left) / rect.width) * 100;
            const delta = newLeftWidthPercent - newPanelSizes[0];
            if (newLeftWidthPercent > 10 && (newPanelSizes[1] - delta) > 10) {
                newPanelSizes[0] = newLeftWidthPercent;
                newPanelSizes[1] -= delta;
            }
        } else { // dragging right divider
            const leftDividerX = rect.left + (rect.width * newPanelSizes[0] / 100);
            const newMiddleWidthPercent = ((e.clientX - leftDividerX) / rect.width) * 100;
            const delta = newMiddleWidthPercent - newPanelSizes[1];
            if (newMiddleWidthPercent > 10 && (newPanelSizes[2] - delta) > 10) {
                newPanelSizes[1] = newMiddleWidthPercent;
                newPanelSizes[2] -= delta;
            }
        }
        setPanelSizes(newPanelSizes);
    };


    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [panelSizes]);

  useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory]);

    const updatePreview = useCallback(() => {
    if (!previewRoot) {
      setSrcDoc('<html><body><h1 style="color: #ccc; font-family: sans-serif;">Select a preview root directory.</h1></body></html>');
      return;
    }

    const basePath = previewRoot === '/' ? '/' : (previewRoot.endsWith('/') ? `${previewRoot}` : `${previewRoot}/`);
    const htmlPath = `${basePath}index.html`;
    const readmeMdPath = `${basePath}README.md`;
    const indexMdPath = `${basePath}index.md`;
    
    // Check for common script entry points
    const scriptFilePaths = [
        `${basePath}index.tsx`, `${basePath}index.jsx`, `${basePath}App.tsx`,
        `${basePath}App.jsx`, `${basePath}main.tsx`, `${basePath}main.jsx`,
        `${basePath}index.ts`, `${basePath}index.js`, `${basePath}App.ts`,
        `${basePath}App.js`, `${basePath}main.ts`, `${basePath}main.js`,
    ];

    const indexHtml = fileSystem[htmlPath];
    const readmeMd = fileSystem[readmeMdPath];
    const indexMd = fileSystem[indexMdPath];
    
    let scriptFileToRender: { path: string; content: string } | null = null;
    for (const path of scriptFilePaths) {
        if (fileSystem[path] !== undefined) {
            scriptFileToRender = { path, content: fileSystem[path] };
            break;
        }
    }

    if (indexHtml !== undefined) {
        const doc = new DOMParser().parseFromString(indexHtml, 'text/html');

        doc.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
            const href = link.getAttribute('href');
            if (href && !href.startsWith('http')) {
                const cssPath = resolvePath(htmlPath, href);
                if (fileSystem[cssPath]) {
                    const style = doc.createElement('style');
                    style.textContent = fileSystem[cssPath];
                    doc.head.appendChild(style);
                    link.remove();
                }
            }
        });

        doc.querySelectorAll('script').forEach(script => {
          const src = script.getAttribute('src');
          if (src && !src.startsWith('http')) {
            const jsPath = resolvePath(htmlPath, src);
            if (fileSystem[jsPath]) {
              const newScript = doc.createElement('script');
              newScript.textContent = fileSystem[jsPath];
              for (const attr of script.attributes) {
                newScript.setAttribute(attr.name, attr.value);
              }
              newScript.removeAttribute('src');
              script.parentNode?.replaceChild(newScript, script);
            }
          }
        });

        setSrcDoc(`<!DOCTYPE html>${doc.documentElement.outerHTML}`);
    } else if (readmeMd !== undefined || indexMd !== undefined) {
      const mdContent = readmeMd || indexMd || '';
      const mdHtml = marked.parse(mdContent);
      
      const mdSrcDoc = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${readmeMd ? 'README.md' : 'index.md'}</title>
          <style>
            :root {
              --neon-blue: #00BFFF; --neon-pink: #FF1493; --neon-green: #39FF14; --neon-purple: #BF00FF;
              --dark-bg: #121212; --card-bg: rgba(28, 28, 30, 0.75);
              --card-border: rgba(255, 255, 255, 0.1); --text-color: #EAEAEA;
            }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji';
              line-height: 1.6;
              background-color: var(--dark-bg);
              color: var(--text-color);
              padding: 2rem 3rem;
              margin: 0;
            }
            .prose { max-width: 800px; margin: 0 auto; }
            .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 { color: var(--neon-pink); border-bottom: 1px solid var(--card-border); padding-bottom: 0.3em; margin-top: 1.5em; }
            .prose h1 { font-size: 2.25em; } .prose h2 { font-size: 1.75em; }
            .prose a { color: var(--neon-blue); text-shadow: 0 0 2px var(--neon-blue); text-decoration: none; }
            .prose a:hover { text-decoration: underline; }
            .prose code { color: var(--neon-green); background-color: rgba(57, 255, 20, 0.1); padding: 0.2em 0.4em; margin: 0; font-size: 85%; border-radius: 6px; }
            .prose pre { background-color: var(--card-bg); border: 1px solid var(--card-border); padding: 1rem; border-radius: 0.5rem; overflow-x: auto; }
            .prose pre code { background-color: transparent; border: none; padding: 0; font-size: 100%; color: inherit; }
            .prose img { max-width: 100%; height: auto; border-radius: 0.5rem; }
            .prose ul, .prose ol { padding-left: 2rem; }
            .prose blockquote { border-left: 0.25em solid var(--neon-purple); padding-left: 1em; color: #a9a9a9; margin-left: 0; }
            .prose table { width: 100%; border-collapse: collapse; }
            .prose th, .prose td { border: 1px solid var(--card-border); padding: 0.5em 1em; }
            .prose th { background-color: rgba(255,255,255,0.05); }
          </style>
        </head>
        <body>
          <main class="prose">
            ${mdHtml}
          </main>
        </body>
        </html>
      `;
      setSrcDoc(mdSrcDoc);
    } else if (scriptFileToRender) {
      const { path, content } = scriptFileToRender;
      const escapedCode = content
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');

      const codeSrcDoc = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Preview: ${path.split('/').pop()}</title>
          <style>
            :root {
              --neon-blue: #00BFFF; --neon-pink: #FF1493; --neon-green: #39FF14; --neon-purple: #BF00FF;
              --dark-bg: #121212; --card-border: rgba(255, 255, 255, 0.1); --text-color: #EAEAEA;
            }
            body { 
              font-family: 'Fira Code', 'Dank Mono', monospace;
              line-height: 1.6;
              background-color: #1e1e1e; /* Match editor background */
              color: var(--text-color);
              margin: 0;
            }
            .header {
                background-color: #2d2d2d;
                padding: 0.75rem 1.5rem;
                font-size: 0.9rem;
                color: #ccc;
                border-bottom: 1px solid var(--card-border);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            }
            .header strong {
                color: var(--neon-green);
                font-weight: 600;
            }
            pre { 
              background-color: transparent;
              margin: 0;
              padding: 1rem 1.5rem; 
              overflow-x: auto; 
              font-size: 14px;
            }
            code { 
              background-color: transparent; 
              color: inherit;
            }
          </style>
        </head>
        <body>
            <div class="header">
                <p>No <strong>index.html</strong> or <strong>README.md</strong> found. Previewing code from <strong>${path.split('/').pop()}</strong>.</p>
            </div>
            <pre><code>${escapedCode}</code></pre>
        </body>
        </html>
      `;
      setSrcDoc(codeSrcDoc);
    } else {
        setSrcDoc('<html><body><h1 style="color: #ccc; font-family: sans-serif; text-align: center; margin-top: 2rem;">No previewable file found.</h1><p style="color: #999; font-family: sans-serif; text-align: center;">Create an index.html, README.md, index.tsx, or similar file in this directory to see a preview.</p></body></html>');
    }
  }, [fileSystem, previewRoot]);


  useEffect(() => {
    updatePreview();
  }, [fileSystem, previewRoot, isDragging, updatePreview]);
  
   useEffect(() => {
    if (iframeRef.current && srcDoc) {
      const iframe = iframeRef.current;

      const getCssPath = (el: Element): string => {
        if (!(el instanceof Element)) return '';
        const path = [];
        let currentEl: Element | null = el;
        while (currentEl && currentEl.nodeType === Node.ELEMENT_NODE) {
            let selector = currentEl.nodeName.toLowerCase();
            if (currentEl.id) {
                selector = `#${currentEl.id}`;
                path.unshift(selector);
                break;
            } else {
                let sib: Element | null = currentEl;
                let nth = 1;
                while ((sib = sib.previousElementSibling)) {
                    if (sib.nodeName.toLowerCase() === selector) nth++;
                }
                if (nth !== 1) selector += `:nth-of-type(${nth})`;
            }
            path.unshift(selector);
            currentEl = currentEl.parentElement;
        }
        return path.join(' > ');
      };

      let lastHoveredElement: HTMLElement | null = null;
      const originalStyles = new WeakMap<HTMLElement, { outline: string; outlineOffset: string; cursor: string; }>();

      const removeHighlight = () => {
          if (lastHoveredElement && originalStyles.has(lastHoveredElement)) {
              const styles = originalStyles.get(lastHoveredElement)!;
              lastHoveredElement.style.outline = styles.outline;
              lastHoveredElement.style.outlineOffset = styles.outlineOffset;
              lastHoveredElement.style.cursor = styles.cursor;
              originalStyles.delete(lastHoveredElement);
              lastHoveredElement = null;
          }
      };

      const handleMouseOver = (e: MouseEvent) => {
        let target = e.target as HTMLElement | null;
        if (target && target.nodeType === Node.TEXT_NODE) {
            target = target.parentElement;
        }
        if (!target || target === lastHoveredElement || target.tagName === 'BODY' || target.tagName === 'HTML' || target.closest('[data-no-edit]')) {
             return;
        }
        removeHighlight();
        originalStyles.set(target, { 
            outline: target.style.outline,
            outlineOffset: target.style.outlineOffset,
            cursor: target.style.cursor
        });
        target.style.outline = '2px dashed #FF1493';
        target.style.outlineOffset = '2px';
        target.style.cursor = 'pointer';
        lastHoveredElement = target;
      };

      const handleMouseOut = (e: MouseEvent) => {
          const relatedTarget = e.relatedTarget as Node | null;
          if (lastHoveredElement && (!relatedTarget || !lastHoveredElement.contains(relatedTarget))) {
              removeHighlight();
          }
      };

      const handleElementMouseDown = (e: MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();

          removeHighlight(); // Remove highlight before showing editor

          let target = e.target as HTMLElement | null;

          if (target && target.nodeType === Node.TEXT_NODE) {
              target = target.parentElement;
          }

          if (!target || target.tagName === 'BODY' || target.tagName === 'HTML' || target.closest('[data-no-edit]')) {
              return;
          }

          let elementId = target.dataset.editableId;
          let selector: string | undefined = undefined;

          if (!elementId) {
              elementId = `editable-${uuidv4()}`;
              selector = getCssPath(target);
          }

          const rect = target.getBoundingClientRect();
          const iframeRect = iframe.getBoundingClientRect();
          
          const tempEl = target.cloneNode(true) as HTMLElement;
          tempEl.dataset.editableId = elementId;
          
          setEditingElementInfo({
              id: elementId,
              html: tempEl.outerHTML,
              position: {
                  top: rect.top + iframeRect.top,
                  left: rect.left + iframeRect.left,
              },
              selector,
          });
      };
      
      const setupIframeListeners = () => {
        const iframeDoc = iframe.contentDocument;
        if (iframeDoc) {
            const basePath = previewRoot === '/' ? '/' : (previewRoot.endsWith('/') ? `${previewRoot}` : `${previewRoot}/`);
            const htmlPath = `${basePath}index.html`;

            if (fileSystem[htmlPath] !== undefined) {
                iframeDoc.body.addEventListener('mouseover', handleMouseOver);
                iframeDoc.body.addEventListener('mouseout', handleMouseOut);
                iframeDoc.body.addEventListener('mousedown', handleElementMouseDown);
            }
        }
      }

      const cleanupListeners = () => {
          const iframeDoc = iframe.contentDocument;
          if (iframeDoc) {
              iframeDoc.body.removeEventListener('mouseover', handleMouseOver);
              iframeDoc.body.removeEventListener('mouseout', handleMouseOut);
              iframeDoc.body.removeEventListener('mousedown', handleElementMouseDown);
          }
      };

      iframe.onload = () => {
        cleanupListeners();
        setupIframeListeners();
      }
      
      if (iframe.contentDocument?.readyState === 'complete') {
        setupIframeListeners();
      }

      return cleanupListeners;
    }
  }, [srcDoc, previewRoot, fileSystem]);

  const handleFileSelect = (path: string) => {
      setActiveFile(path);
      if (!openFiles.includes(path)) {
          setOpenFiles(prev => [...prev, path]);
      }
      setActiveTab('editor');
  };

  const handleApplyCode = (codeUpdates: { path: string; content: string }[]) => {
    if (codeUpdates && codeUpdates.length > 0) {
      setPendingCodeChanges(codeUpdates);
    }
  };

  const handleConfirmApplyChanges = (decision: { action: 'apply' } | { action: 'save_as', newPath: string }) => {
    if (!pendingCodeChanges) return;

    if (decision.action === 'apply') {
        setFileSystem(prevFs => {
            const newFs = { ...prevFs };
            pendingCodeChanges.forEach(({ path, content }) => {
                newFs[path] = content;
            });
            saveSnapshot(newFs);
            return newFs;
        });
        // Select the first modified file
        handleFileSelect(pendingCodeChanges[0].path);
    } else if (decision.action === 'save_as') {
        const { newPath } = decision;
        const content = pendingCodeChanges[0].content; // We've ensured there's only one

        setFileSystem(prevFs => {
            const newFs = { ...prevFs, [newPath]: content };
            saveSnapshot(newFs);
            return newFs;
        });
        // Select the new file
        handleFileSelect(newPath);
    }

    setPendingCodeChanges(null);
  };

  const handleNewFile = (path: string) => {
    if (fileSystem[path] !== undefined) {
      alert("File already exists at this path.");
      return;
    }
    setFileSystem(prevFs => {
      const newFs = { ...prevFs, [path]: '' };
      saveSnapshot(newFs);
      return newFs;
    });
    handleFileSelect(path);
  };

  const handleNewFolder = (path: string) => {
    const placeholder = path.endsWith('/') ? `${path}.placeholder` : `${path}/.placeholder`;
    if (fileSystem[placeholder] !== undefined) {
      alert("Folder already exists at this path.");
      return;
    }
    setFileSystem(prevFs => {
      const newFs = { ...prevFs, [placeholder]: '' };
      saveSnapshot(newFs);
      return newFs;
    });
  };

  const handleFileUpload = async (files: FileList) => {
    let nonZipFsUpdates: FileSystemState = {};
    let hasProcessedZip = false; 

    for (const file of files) {
      // Prioritize processing a single ZIP file
      if (file.name.endsWith('.zip') && !hasProcessedZip) {
        hasProcessedZip = true;
        const arrayBuffer = await file.arrayBuffer();
        setPendingZip({ file, contents: arrayBuffer });
        // Stop processing other files to show the unpack modal
        return; 
      } else if (!file.name.endsWith('.zip')) {
        try {
            const content = await file.text();
            nonZipFsUpdates[`/${file.name}`] = content;
        } catch (e) {
            console.error(`Could not read file ${file.name} as text. It might be a binary file.`, e);
            alert(`Could not read file ${file.name}. It may be a binary file or an unsupported format.`);
        }
      }
    }

    // Apply non-ZIP file updates if any were processed
    if (Object.keys(nonZipFsUpdates).length > 0) {
        setFileSystem(prevFs => {
            const newFs = { ...prevFs, ...nonZipFsUpdates };
            saveSnapshot(newFs);
            return newFs;
        });
    }
  };
  
  const handleConfirmUnpack = async (destinationPath: string) => {
    if (!pendingZip) return;

    setIsLoading(true);
    setLoadingMessage(`Unpacking ${pendingZip.file.name}...`);
    setError('');
    
    // Normalize path
    let cleanDestinationPath = destinationPath.trim();
    if (!cleanDestinationPath.startsWith('/')) {
        cleanDestinationPath = `/${cleanDestinationPath}`;
    }
    if (cleanDestinationPath.endsWith('/')) {
        cleanDestinationPath = cleanDestinationPath.slice(0, -1);
    }
    if (cleanDestinationPath === '/') {
        cleanDestinationPath = ''; // Unpack to root
    }

    const zip = new JSZip();
    try {
        const contents = await zip.loadAsync(pendingZip.contents);
        const newFileUpdates: Record<string, string> = {};
        const fileList: string[] = [];

        for (const [relativePath, zipEntry] of Object.entries(contents.files)) {
            const entry = zipEntry as JSZipObject;
            if (!entry.dir) {
                try {
                    const fileContent = await entry.async('string');
                    const fullPath = `${cleanDestinationPath}/${relativePath}`.replace('//', '/');
                    newFileUpdates[fullPath] = fileContent;
                    fileList.push(relativePath);
                } catch (e) {
                    console.warn(`Could not read file ${relativePath} from zip as text. It might be a binary file.`);
                }
            }
        }

        setFileSystem(prevFs => {
            const newFs = { ...prevFs, ...newFileUpdates };
            saveSnapshot(newFs);
            return newFs;
        });
        
        setChatHistory(prev => [...prev, { role: 'system', content: `Successfully unpacked ${fileList.length} files from ${pendingZip.file.name} to ${cleanDestinationPath || '/'}.` }]);
        
        // Trigger AI interaction
        const aiPrompt = `I just uploaded and unpacked a zip file named "${pendingZip.file.name}" into the \`${cleanDestinationPath || '/'}\` directory. The unpacked files are: ${fileList.slice(0, 10).join(', ')}${fileList.length > 10 ? '...' : ''}. Can you analyze these new files, tell me what this project is about, and suggest the first step to get it running or explore it further?`;
        
        // Use a short timeout to ensure the file system state is updated before the AI reads it
        setTimeout(() => {
            handleChatSubmit({ preventDefault: () => {} } as React.FormEvent, aiPrompt);
        }, 100);

    } catch (e) {
        const errorMsg = e instanceof Error ? e.message : "An unknown error occurred.";
        setError(`Failed to unpack ZIP file: ${errorMsg}`);
        setChatHistory(prev => [...prev, { role: 'system', content: `Error unpacking ${pendingZip!.file.name}: ${errorMsg}` }]);
    } finally {
        setPendingZip(null); // Close modal
        // Loading state will be managed by handleChatSubmit now
    }
  };

  const handleDownloadProject = () => {
    const zip = new JSZip();
    Object.entries(fileSystem).forEach(([path, content]) => {
      if (path.endsWith('/.placeholder')) return;
      zip.file(path.substring(1), content);
    });
    zip.generateAsync({ type: 'blob' }).then(content => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = 'sandbox-project.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  const handleRefineCode = async () => {
    if (!activeFile || !refineInstruction.trim()) return;
    setIsRefining(true);
    setError('');
    try {
        const currentContent = fileSystem[activeFile] || '';
        const language = activeFile.split('.').pop() || 'text';
        const newContent = await refineCodeWithAgent(currentContent, language, refineInstruction);
        setFileSystem(prevFs => {
            const newFs = { ...prevFs, [activeFile]: newContent };
            saveSnapshot(newFs);
            return newFs;
        });
        setRefineInstruction('');
    } catch (e) {
        if (e instanceof Error) {
            setError(`Refinement failed: ${e.message}`);
        } else {
            setError("An unknown error occurred during code refinement.");
        }
    } finally {
        setIsRefining(false);
    }
  };

  const handleInlineSave = (newHtml: string, elementId: string) => {
     const selector = editingElementInfo?.selector;

     setFileSystem(prevFs => {
        if (!previewRoot) return prevFs;
        const basePath = previewRoot === '/' ? '/' : (previewRoot.endsWith('/') ? previewRoot : `${previewRoot}/`);
        const htmlPath = `${basePath}index.html`;

        const content = prevFs[htmlPath];
        if (!content) return prevFs;

        const doc = new DOMParser().parseFromString(content, 'text/html');
        let element: Element | null = null;
        
        try {
            if (selector) {
                element = doc.querySelector(selector);
            } else {
                element = doc.querySelector(`[data-editable-id="${elementId}"]`);
            }
        } catch (e) {
            console.error("Failed to select element for inline editing:", e);
            return prevFs;
        }

        if (element) {
            const tempWrapper = doc.createElement('div');
            tempWrapper.innerHTML = newHtml;
            const newElement = tempWrapper.firstChild;
            if (newElement) {
               element.replaceWith(newElement);
               const newFileContent = `<!DOCTYPE html>\n` + doc.documentElement.outerHTML;
               const newFs = { ...prevFs, [htmlPath]: newFileContent };
               saveSnapshot(newFs);
               return newFs;
            }
        } else {
            console.warn(`Could not find element to save. Selector: ${selector}, ID: ${elementId}`);
        }

        return prevFs;
     });
     setEditingElementInfo(null);
  };

  const handleTerminalSubmit = async (command: string) => {
    const commandId = uuidv4();
    const newHistoryLine: TerminalLine = { id: commandId, command, cwd: terminalCwd };
    setTerminalHistory(prev => [...prev, newHistoryLine]);
    setIsTerminalLoading(true);

    try {
        const result = await runCommandInTerminal(command, terminalCwd, fileSystem);
        
        setTerminalHistory(prev => prev.map(line => 
            line.id === commandId ? { ...line, stdout: result.stdout, stderr: result.stderr } : line
        ));
        setTerminalCwd(result.newCurrentDirectory);

        if (result.fileSystemChanges && result.fileSystemChanges.length > 0) {
            setFileSystem(prevFs => {
                let newFs = { ...prevFs };
                result.fileSystemChanges.forEach(change => {
                    switch (change.action) {
                        case 'create':
                        case 'update':
                            newFs[change.path] = change.content || '';
                            break;
                        case 'delete':
                            delete newFs[change.path];
                            break;
                    }
                });
                saveSnapshot(newFs);
                return newFs;
            });
        }
    } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'An unknown error occurred.';
        setTerminalHistory(prev => prev.map(line =>
            line.id === commandId ? { ...line, stderr: `Execution failed: ${errorMsg}` } : line
        ));
    } finally {
        setIsTerminalLoading(false);
    }
  };

  const handleGithubConnect = async (token: string) => {
      setError('');
      setIsLoading(true);
      try {
          const user = await githubService.connectToGithub(token);
          setGithubUser(user);
          setIsGithubConnected(true);
          const repos = await githubService.listRepos();
          setGithubRepos(repos);
      } catch (e: any) {
          setError(e.message);
          setGithubToken('');
          githubService.disconnectFromGithub();
      } finally {
          setIsLoading(false);
      }
  };

  const handleGithubDisconnect = () => {
      githubService.disconnectFromGithub();
      setGithubToken('');
      setIsGithubConnected(false);
      setGithubUser(null);
      setGithubRepos([]);
      setSelectedRepoFullName('');
      setRepoBranches([]);
      setSelectedBranchName('');
      setInitialGithubFileSystem(null);
      setChangedFiles([]);
  };

  const handleRepoSelected = async (repoFullName: string) => {
    setSelectedRepoFullName(repoFullName);
    setSelectedBranchName('');
    setRepoBranches([]);
    if (repoFullName) {
        setIsLoading(true);
        setError('');
        try {
            const [owner, repo] = repoFullName.split('/');
            const branches = await githubService.listBranches(owner, repo);
            setRepoBranches(branches);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }
  };
  
  const handleLoadRepo = async () => {
    if (!selectedRepoFullName || !selectedBranchName) return;
    setIsLoadingFromGithub(true);
    setIsLoading(true);
    setLoadingMessage('Loading repository from GitHub...');
    setError('');
    try {
        const [owner, repo] = selectedRepoFullName.split('/');
        const fs = await githubService.getRepoContents(owner, repo, selectedBranchName);
        setFileSystem(fs);
        setInitialGithubFileSystem(fs);
        setChangedFiles([]);
        setOpenFiles(['/README.md', '/index.html'].filter(f => f in fs));
        setActiveFile(Object.keys(fs).includes('/README.md') ? '/README.md' : (Object.keys(fs)[0] || null));
        setPreviewRoot('/');
        saveSnapshot(fs);
    } catch(e: any) {
        setError(`Failed to load repo: ${e.message}`);
    } finally {
        setIsLoadingFromGithub(false);
        setIsLoading(false);
        setLoadingMessage('');
    }
  };
  
  const handleCommitAndPush = async (message: string) => {
      if (!selectedRepoFullName || !selectedBranchName || !initialGithubFileSystem) return;
      setIsLoading(true);
      setLoadingMessage('Committing and pushing to GitHub...');
      setError('');
      try {
          const [owner, repo] = selectedRepoFullName.split('/');
          const commitUrl = await githubService.commitAndPush({
              owner,
              repo,
              branch: selectedBranchName,
              message,
              changes: changedFiles,
              currentFileSystem: fileSystem,
              initialFileSystem: initialGithubFileSystem
          });
          setInitialGithubFileSystem(fileSystem);
          setChangedFiles([]);
          alert(`Successfully pushed to GitHub! Commit URL: ${commitUrl}`);
      } catch (e: any) {
          setError(`Commit failed: ${e.message}`);
      } finally {
          setIsLoading(false);
          setLoadingMessage('');
      }
  };

  useEffect(() => {
    if (!initialGithubFileSystem) {
        setChangedFiles([]);
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

    setChangedFiles(changes.filter(c => !c.path.endsWith('/.placeholder')));
  }, [fileSystem, initialGithubFileSystem]);
  
  const handleChatSubmit = async (e: React.FormEvent, prompt?: string) => {
        if(e) e.preventDefault();
        const userInput = prompt || cliInput;
        if (!userInput.trim() || isLoading) return;

        const newUserMessage: ChatMessage = { role: 'user', content: userInput };
        const newHistory = [...chatHistory, newUserMessage];
        setChatHistory(newHistory);
        setCliInput('');
        setIsLoading(true);
        setLoadingMessage('Lyra is thinking...');
        setError('');
        setIsHintLoading(true);

        try {
            const result = await chatWithAgent(newHistory, fileSystem, previewRoot);
            
            const modelMessage: ChatMessage = { 
                role: 'model', 
                content: result.text,
                explanation: result.explanation,
                code: result.code,
                suggestions: result.suggestions,
            };
            
            setChatHistory(prev => [...prev, modelMessage]);

        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
            setError(`Agent Error: ${errorMessage}`);
            setChatHistory(chatHistory);
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
            getAiHint(newHistory).then(setAiHint).finally(() => setIsHintLoading(false));
        }
    };
    
    const handleSuggestionClick = (suggestion: string) => {
        handleChatSubmit(new Event('submit') as any, suggestion);
    };

    const handleMouseDown = (index: number) => {
        dragDividerIndex.current = index;
    };
    
  if (isDBLoading) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-[var(--dark-bg)]">
        <SpinnerIcon className="h-8 w-8 animate-spin text-[var(--neon-purple)]" />
        <p className="ml-4 text-lg">Loading Sandbox...</p>
      </div>
    );
  }
    
    return (
    <div className="flex flex-col h-full overflow-hidden">
      {!isFocusMode && (
         <div 
            className="flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out bg-black/20"
            style={{ 
              height: isChatMaximized ? 'calc(100% - 60px)' : (isChatMinimized ? '52px' : `${chatPanelHeight}px`),
              minHeight: isChatMinimized ? '52px' : '150px'
            }}
          >
           <div className="flex items-center justify-between p-2 pl-4 border-b border-[var(--card-border)] bg-black/30 backdrop-blur-sm">
             <div className="flex items-center gap-2">
                <MagicWandIcon className="h-5 w-5 text-[var(--neon-blue)]" />
                <h2 className="font-semibold tracking-wide">Inference</h2>
             </div>
             <div className="flex items-center gap-2">
                {isChatMinimized && <p className="text-xs text-gray-400 truncate max-w-sm">{chatHistory.slice(-1)[0]?.content}</p>}
                <button onClick={() => setIsChatMaximized(p => !p)} className="p-1.5 hover:bg-white/10 rounded-md text-gray-300" title={isChatMaximized ? 'Restore' : 'Maximize'}>
                  {isChatMaximized ? <MinimizeIcon className="h-4 w-4"/> : <MaximizeIcon className="h-4 w-4"/>}
                </button>
                <button onClick={() => setIsChatMinimized(p => !p)} className="p-1.5 hover:bg-white/10 rounded-md text-gray-300" title={isChatMinimized ? 'Expand' : 'Minimize'}>
                  {isChatMinimized ? <ChevronUpIcon className="h-4 w-4"/> : <ChevronDownIcon className="h-4 w-4"/>}
                </button>
             </div>
           </div>

           {!isChatMinimized && (
             <div ref={chatContainerRef} className="flex-grow p-4 overflow-y-auto">
                {chatHistory.map((msg, index) => (
                    <ChatMessageView key={index} message={msg} onApplyCode={handleApplyCode} onSuggestionClick={handleSuggestionClick} />
                ))}
                {isLoading && (
                    <div className="flex items-center gap-3 my-4">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-[var(--neon-purple)] neon-glow-purple">
                           <GeminiIcon className="h-5 w-5 text-black" />
                        </div>
                        <div className="p-4 rounded-xl max-w-xl bg-black/30 border border-[var(--neon-purple)] text-gray-300 flex items-center gap-3">
                           <SpinnerIcon className="h-5 w-5 animate-spin" />
                           <span className="text-sm italic">{loadingMessage || 'Thinking...'}</span>
                        </div>
                    </div>
                )}
             </div>
           )}

            {!isChatMinimized && (
              <div className="p-3 border-t border-[var(--card-border)] bg-black/30">
                  <div className="flex items-center gap-2 mb-2">
                    {aiHint && !isHintLoading && (
                      <button onClick={(e) => { setCliInput(aiHint); handleChatSubmit(e as any, aiHint); }} className="flex items-center gap-2 text-xs text-left px-3 py-1.5 bg-black/30 hover:bg-black/40 border border-[var(--card-border)] rounded-full transition-colors text-gray-300 hover:text-white">
                        <LightbulbIcon className="h-4 w-4 text-[var(--neon-yellow)]" />
                        <span>{aiHint}</span>
                      </button>
                    )}
                    {isHintLoading && <div className="text-xs text-gray-500 italic">Getting suggestion...</div>}
                  </div>
                  <form onSubmit={handleChatSubmit} className="flex gap-2">
                      <input
                          type="text"
                          value={cliInput}
                          onChange={(e) => setCliInput(e.target.value)}
                          placeholder="Ask the agent to make changes..."
                          className="flex-grow p-2 bg-black/30 border border-[var(--card-border)] rounded-md focus:ring-2 focus:ring-[var(--neon-blue)] focus:outline-none transition"
                          disabled={isLoading}
                      />
                      <button type="submit" disabled={isLoading || !cliInput.trim()} className="bg-[var(--neon-blue)] hover:brightness-125 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-bold py-2 px-4 rounded-md transition-all">
                          {isLoading ? <SpinnerIcon className="h-5 w-5 animate-spin" /> : 'Send'}
                      </button>
                  </form>
                  {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
              </div>
            )}
            
            {!isChatMaximized && !isChatMinimized && (
              <div 
                className="w-full h-1.5 cursor-row-resize bg-black/50 hover:bg-[var(--neon-blue)] transition-colors"
                onMouseDown={() => setIsResizingChat(true)}
                 onMouseUp={() => setIsResizingChat(false)}
              ></div>
            )}
        </div>
      )}

      <div 
        ref={containerRef}
        className="flex-grow flex overflow-hidden"
        onMouseUp={() => setIsResizingChat(false)}
        onMouseLeave={() => setIsResizingChat(false)}
        onMouseMove={e => {
            if (isResizingChat) {
                setChatPanelHeight(p => Math.max(150, document.body.clientHeight - e.clientY));
            }
        }}
      >
        {!isFocusMode && (
          <>
            <div 
              className="flex flex-col bg-black/20 overflow-y-auto"
              style={{ width: `${panelSizes[0]}%` }}
            >
               <div className="flex-grow p-4 space-y-4">
                  <CollapsibleSection title="File Explorer">
                      <FileExplorer 
                          fileSystem={fileSystem}
                          activeFile={activeFile}
                          previewRoot={previewRoot}
                          onFileSelect={handleFileSelect}
                          onNewFile={handleNewFile}
                          onNewFolder={handleNewFolder}
                          onFileUpload={handleFileUpload}
                          onSetPreviewRoot={path => setPreviewRoot(path)}
                          onDownloadProject={handleDownloadProject}
                          onRefresh={updatePreview}
                      />
                  </CollapsibleSection>
                  <CollapsibleSection title="GitHub">
                      <GithubPanel
                        isConnected={isGithubConnected}
                        user={githubUser}
                        repos={githubRepos}
                        branches={repoBranches}
                        selectedRepo={selectedRepoFullName}
                        selectedBranch={selectedBranchName}
                        changedFiles={changedFiles}
                        isLoading={isLoading || isLoadingFromGithub}
                        error={error}
                        onConnect={handleGithubConnect}
                        onDisconnect={handleGithubDisconnect}
                        onRepoSelected={handleRepoSelected}
                        onBranchSelected={setSelectedBranchName}
                        onLoadRepo={handleLoadRepo}
                        onCommit={handleCommitAndPush}
                        initialToken={githubToken}
                        onTokenChange={setGithubToken}
                      />
                  </CollapsibleSection>
                  <CollapsibleSection title="System Operator">
                    <SystemOperatorPanel
                        fileSystem={fileSystem}
                        onUpdateFileSystem={(newFs, snapshot) => {
                          setFileSystem(newFs);
                          if(snapshot) saveSnapshot(newFs);
                        }}
                        onRunCommand={handleTerminalSubmit}
                        onDebug={(context) => handleChatSubmit(new Event('submit') as any, `The last command in my container failed. Here is the context, please help me debug it: ${context}`)}
                    />
                  </CollapsibleSection>
               </div>
            </div>

            <div 
                className="cursor-col-resize w-1.5 bg-black/50 hover:bg-[var(--neon-blue)] transition-colors"
                onMouseDown={() => handleMouseDown(0)}
            ></div>
            
            <div 
              className="flex flex-col bg-black/20 overflow-hidden"
              style={{ width: `${panelSizes[1]}%` }}
            >
              <div className="flex-shrink-0 flex items-center justify-between p-2 pl-4 border-b border-[var(--card-border)] bg-black/30 backdrop-blur-sm">
                  <div className="flex items-center">
                      <button 
                          onClick={() => setActiveTab('editor')} 
                          className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors ${activeTab === 'editor' ? 'bg-black/40 text-white' : 'text-gray-400 hover:bg-black/20'}`}
                      >
                          <CodeIcon className="h-4 w-4" /> Editor
                      </button>
                      <button 
                          onClick={() => setActiveTab('terminal')} 
                          className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors ${activeTab === 'terminal' ? 'bg-black/40 text-white' : 'text-gray-400 hover:bg-black/20'}`}
                      >
                          <TerminalIcon className="h-4 w-4" /> Terminal
                      </button>
                  </div>
              </div>

              <div className="flex-grow relative overflow-y-auto">
                {activeTab === 'editor' ? (
                  <div className="absolute inset-0 flex flex-col">
                      <div className="flex-shrink-0 bg-[#1e1e1e] p-2 flex items-center justify-between border-b border-black/30 gap-2">
                        <div className="flex items-center overflow-x-auto no-scrollbar">
                           {openFiles.map(file => (
                              <button
                                key={file}
                                onClick={() => setActiveFile(file)}
                                className={`flex-shrink-0 px-3 py-1.5 text-xs rounded-md flex items-center gap-2 transition-colors whitespace-nowrap ${activeFile === file ? 'bg-black/40 text-white' : 'text-gray-400 hover:bg-black/20'}`}
                              >
                                {file.split('/').pop()}
                                <XIcon 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const updatedFiles = openFiles.filter(f => f !== file);
                                        setOpenFiles(updatedFiles);
                                        if (activeFile === file) {
                                            setActiveFile(updatedFiles[0] || null);
                                        }
                                    }}
                                    className="h-3 w-3 hover:text-white"
                                />
                              </button>
                           ))}
                        </div>
                      </div>
                      <div className="flex-grow relative">
                          {activeFile && fileSystem[activeFile] !== undefined ? (
                            <>
                              <form onSubmit={(e) => {e.preventDefault(); handleRefineCode();}} className="absolute top-0 right-0 z-10 p-2 flex gap-1 bg-[#1e1e1e]/80 backdrop-blur-sm rounded-bl-lg">
                                <input 
                                  type="text"
                                  value={refineInstruction}
                                  onChange={(e) => setRefineInstruction(e.target.value)}
                                  placeholder="Refine selection..."
                                  className="p-1 text-xs bg-black/30 border border-[var(--card-border)] rounded-md focus:ring-1 focus:ring-[var(--neon-pink)] focus:outline-none transition w-48"
                                />
                                <button type="submit" disabled={isRefining || !refineInstruction.trim()} className="p-1.5 bg-[var(--neon-pink)] hover:brightness-125 rounded-md disabled:bg-gray-600">
                                    {isRefining ? <SpinnerIcon className="h-4 w-4 animate-spin text-black" /> : <MagicWandIcon className="h-4 w-4 text-black" />}
                                </button>
                              </form>
                              <CodeEditor
                                  value={fileSystem[activeFile] || ''}
                                  language={activeFile.split('.').pop() || 'markdown'}
                                  onChange={(newCode) => setFileSystem(fs => ({ ...fs, [activeFile]: newCode }))}
                                  onSave={() => handleSaveState()}
                              />
                            </>
                          ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center text-gray-500">
                              <DocumentTextIcon className="h-12 w-12 mb-2" />
                              <p className="font-semibold">No file selected</p>
                              <p className="text-sm">Select a file from the explorer to begin editing.</p>
                            </div>
                          )}
                      </div>
                  </div>
                ) : (
                  <Terminal 
                    history={terminalHistory}
                    cwd={terminalCwd}
                    onSubmitCommand={handleTerminalSubmit}
                    isLoading={isTerminalLoading}
                  />
                )}
              </div>
            </div>

            <div 
                className="cursor-col-resize w-1.5 bg-black/50 hover:bg-[var(--neon-blue)] transition-colors"
                onMouseDown={() => handleMouseDown(1)}
            ></div>
          </>
        )}
        
        <div 
          className="flex flex-col bg-black/20"
          style={{ width: isFocusMode ? '100%' : `${panelSizes[2]}%` }}
        >
          <div className="flex items-center justify-between p-2 pl-4 border-b border-[var(--card-border)] bg-black/30 backdrop-blur-sm">
             <div className="flex items-center gap-2">
                <CodeIcon className="h-5 w-5 text-[var(--neon-pink)]" />
                <h2 className="font-semibold tracking-wide">Live Preview</h2>
             </div>
             <div className="flex items-center gap-2">
                 <p className="text-xs text-gray-400">Previewing: {previewRoot || 'N/A'}</p>
                 <button onClick={onToggleFocusMode} className="p-1.5 hover:bg-white/10 rounded-md text-gray-300" title={isFocusMode ? 'Exit Focus Mode' : 'Enter Focus Mode'}>
                     {isFocusMode ? <MinimizeIcon className="h-4 w-4" /> : <MaximizeIcon className="h-4 w-4" />}
                 </button>
             </div>
          </div>
          <div className="flex-grow bg-[#2d2d2d] relative overflow-hidden">
            <iframe
                ref={iframeRef}
                srcDoc={srcDoc}
                title="Live Preview"
                sandbox="allow-scripts allow-modals"
                className="w-full h-full border-none"
                style={{ pointerEvents: isDragging ? 'none' : 'auto' }}
            />
            {isDragging && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-20">
                    <p className="text-white text-lg font-bold">Drop to add component</p>
                </div>
            )}
             {editingElementInfo && (
                <InlineEditor
                    elementHtml={editingElementInfo.html}
                    position={editingElementInfo.position}
                    onSave={(newHtml) => handleInlineSave(newHtml, editingElementInfo.id)}
                    onCancel={() => setEditingElementInfo(null)}
                />
            )}
          </div>
        </div>
      </div>
      
      {!isFocusMode && <OrbMenu onSave={handleSaveState} lastSavedTimestamp={lastSavedTimestamp} onToggleFocusMode={onToggleFocusMode} />}

      {pendingCodeChanges && (
        <ApplyChangesModal
            codeUpdates={pendingCodeChanges}
            onClose={() => setPendingCodeChanges(null)}
            onConfirm={handleConfirmApplyChanges}
        />
      )}
      
      {pendingZip && (
        <UnpackZipModal
            isOpen={!!pendingZip}
            fileName={pendingZip.file.name}
            onClose={() => setPendingZip(null)}
            onUnpack={handleConfirmUnpack}
        />
      )}
    </div>
  );
};

export default OrchestratorPanel;