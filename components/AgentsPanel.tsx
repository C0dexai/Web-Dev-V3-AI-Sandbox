import React, { useState, useEffect, useRef, useCallback } from 'react';
import { chatWithAgent, refineCodeWithAgent, getAiHint, runCommandInTerminal } from '../services/geminiService';
import githubService from '../services/githubService';
import useStore from '../store';
import type { FileSystemState, ChatMessage, TerminalLine } from '../types';
import { SpinnerIcon, MagicWandIcon, LightbulbIcon, DocumentTextIcon, GeminiIcon, MaximizeIcon, MinimizeIcon, ChevronDownIcon, ChevronUpIcon, CodeIcon, TerminalIcon, XIcon } from './Icons';
import CollapsibleSection from './CollapsibleSection';
import ChatMessageView from './ChatMessage';
import FileExplorer from './FileExplorer';
import CodeEditor from './CodePreview';
import SystemOperatorPanel from './SystemOperatorPanel';
import Terminal from './Terminal';
import { marked } from 'marked';
import { v4 as uuidv4 } from 'uuid';
import JSZip, { type JSZipObject } from 'jszip';
import OrbMenu from './OrbMenu';
import GithubPanel from './GithubPanel';
import InlineEditor from './InlineEditor';
import ApplyChangesModal from './ApplyChangesModal';
import UnpackZipModal from './UnpackZipModal';

// Simple path resolver
const resolvePath = (base: string, relative: string): string => {
    // Normalize base to be a directory
    const baseDir = base.endsWith('/') ? base : base.substring(0, base.lastIndexOf('/') + 1);
    const path = new URL(relative, `file://${baseDir}`).pathname;
    return path.startsWith('/') ? path : `/${path}`;
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
  const store = useStore();
  const {
    isDBLoading, loadStateFromDB, fileSystem, setFileSystem, chatHistory, addChatMessage,
    terminalHistory, addTerminalLine, updateTerminalLine, terminalCwd, setTerminalCwd,
    error, setError, panelSizes, setPanelSizes, previewRoot, setPreviewRoot,
    openFiles, setOpenFiles, activeFile, setActiveFile, chatPanelHeight, setChatPanelHeight,
    setGithubState, initialGithubFileSystem
  } = store;

  // Local UI state that doesn't need to be in the global store
  const [cliInput, setCliInput] = useState<string>('');
  const [srcDoc, setSrcDoc] = useState('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'editor' | 'terminal'>('editor');
  const [refineInstruction, setRefineInstruction] = useState<string>('');
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState(false);
  const [editingElementInfo, setEditingElementInfo] = useState<EditingElementInfo | null>(null);
  const [aiHint, setAiHint] = useState<string>('');
  const [isHintLoading, setIsHintLoading] = useState<boolean>(false);
  const [isResizingChat, setIsResizingChat] = useState(false);
  const [isChatMaximized, setIsChatMaximized] = useState(false);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [isTerminalLoading, setIsTerminalLoading] = useState(false);
  const [pendingCodeChanges, setPendingCodeChanges] = useState<{ path: string; content: string }[] | null>(null);
  const [pendingZip, setPendingZip] = useState<{ file: File; contents: ArrayBuffer } | null>(null);

  // Refs
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const dragDividerIndex = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Load state from IndexedDB on initial render
  useEffect(() => {
    loadStateFromDB();
  }, [loadStateFromDB]);

  useEffect(() => {
    const handleMouseUp = () => {
        dragDividerIndex.current = null;
    };
    
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
  }, [panelSizes, setPanelSizes]);

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
        const content = fileSystem[path];
        if (typeof content === 'string') {
            scriptFileToRender = { path, content };
            break;
        }
    }

    if (typeof indexHtml === 'string') {
        const doc = new DOMParser().parseFromString(indexHtml, 'text/html');

        doc.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
            const href = link.getAttribute('href');
            if (href && !href.startsWith('http')) {
                const cssPath = resolvePath(htmlPath, href);
                const cssContent = fileSystem[cssPath];
                if (typeof cssContent === 'string') {
                    const style = doc.createElement('style');
                    style.textContent = cssContent;
                    doc.head.appendChild(style);
                    link.remove();
                }
            }
        });

        doc.querySelectorAll('script').forEach(script => {
          const src = script.getAttribute('src');
          if (src && !src.startsWith('http')) {
            const jsPath = resolvePath(htmlPath, src);
            const jsContent = fileSystem[jsPath];
            if (typeof jsContent === 'string') {
              const newScript = doc.createElement('script');
              newScript.textContent = jsContent;
              for (const attr of script.attributes) {
                newScript.setAttribute(attr.name, attr.value);
              }
              newScript.removeAttribute('src');
              script.parentNode?.replaceChild(newScript, script);
            }
          }
        });

        setSrcDoc(`<!DOCTYPE html>${doc.documentElement.outerHTML}`);
    } else if (typeof readmeMd === 'string' || typeof indexMd === 'string') {
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

  const handleFileSelect = async (path: string) => {
      setActiveFile(path);
      if (!openFiles.includes(path)) {
          setOpenFiles([...openFiles, path]);
      }
      setActiveTab('editor');

      if (store.fileSystem[path] === null && store.selectedRepoFullName) {
          try {
              const [owner, repo] = store.selectedRepoFullName.split('/');
              const treeItem = store.gitTree.find(item => `/${item.path}` === path);

              if (treeItem) {
                  const content = await githubService.getFileContent(owner, repo, treeItem.sha);
                  const newFs = { ...store.fileSystem, [path]: content };
                  const newInitialFs = { ...store.initialGithubFileSystem, [path]: content };

                  store.setFileSystem(newFs, false);
                  store.setGithubState({ initialGithubFileSystem: newInitialFs });

              } else {
                   throw new Error("File not found in the repository tree.");
              }
          } catch (e: any) {
              setError(`Failed to load file ${path}: ${e.message}`);
              setOpenFiles(openFiles.filter(f => f !== path));
              if (activeFile === path) {
                  setActiveFile(openFiles[0] || null);
              }
          }
      }
  };

  const handleApplyCode = (codeUpdates: { path: string; content: string }[]) => {
    if (codeUpdates && codeUpdates.length > 0) {
      setPendingCodeChanges(codeUpdates);
    }
  };

  const handleConfirmApplyChanges = (decision: { action: 'apply' } | { action: 'save_as', newPath: string }) => {
    if (!pendingCodeChanges) return;

    if (decision.action === 'apply') {
        const newFs = { ...fileSystem };
        pendingCodeChanges.forEach(({ path, content }) => {
            newFs[path] = content;
        });
        setFileSystem(newFs, true);
        // Select the first modified file
        handleFileSelect(pendingCodeChanges[0].path);
    } else if (decision.action === 'save_as') {
        const { newPath } = decision;
        const content = pendingCodeChanges[0].content; // We've ensured there's only one

        const newFs = { ...fileSystem, [newPath]: content };
        setFileSystem(newFs, true);
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
    const newFs = { ...fileSystem, [path]: '' };
    setFileSystem(newFs, true);
    handleFileSelect(path);
  };

  const handleNewFolder = (path: string) => {
    const placeholder = path.endsWith('/') ? `${path}.placeholder` : `${path}/.placeholder`;
    if (fileSystem[placeholder] !== undefined) {
      alert("Folder already exists at this path.");
      return;
    }
    const newFs = { ...fileSystem, [placeholder]: '' };
    setFileSystem(newFs, true);
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
        const newFs = { ...fileSystem, ...nonZipFsUpdates };
        setFileSystem(newFs, true);
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

        const newFs = { ...fileSystem, ...newFileUpdates };
        setFileSystem(newFs, true);
        
        addChatMessage({ role: 'system', content: `Successfully unpacked ${fileList.length} files from ${pendingZip.file.name} to ${cleanDestinationPath || '/'}.` });
        
        // Trigger AI interaction
        const aiPrompt = `I just uploaded and unpacked a zip file named "${pendingZip.file.name}" into the \`${cleanDestinationPath || '/'}\` directory. The unpacked files are: ${fileList.slice(0, 10).join(', ')}${fileList.length > 10 ? '...' : ''}. Can you analyze these new files, tell me what this project is about, and suggest the first step to get it running or explore it further?`;
        
        // Use a short timeout to ensure the file system state is updated before the AI reads it
        setTimeout(() => {
            handleChatSubmit({ preventDefault: () => {} } as React.FormEvent, aiPrompt);
        }, 100);

    } catch (e) {
        const errorMsg = e instanceof Error ? e.message : "An unknown error occurred.";
        setError(`Failed to unpack ZIP file: ${errorMsg}`);
        addChatMessage({ role: 'system', content: `Error unpacking ${pendingZip!.file.name}: ${errorMsg}` });
    } finally {
        setPendingZip(null); // Close modal
        // Loading state will be managed by handleChatSubmit now
    }
  };

  const handleDownloadProject = () => {
    const zip = new JSZip();
    Object.keys(fileSystem).forEach(path => {
      if (path.endsWith('/.placeholder')) return;
      const content = fileSystem[path];
      if (typeof content === 'string') {
        zip.file(path.substring(1), content);
      }
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
        const newFs = { ...fileSystem, [activeFile]: newContent };
        setFileSystem(newFs, true);
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
     
     if (!previewRoot) return;
     const basePath = previewRoot === '/' ? '/' : (previewRoot.endsWith('/') ? previewRoot : `${previewRoot}/`);
     const htmlPath = `${basePath}index.html`;

     const content = fileSystem[htmlPath];
     if (!content) return;

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
         setEditingElementInfo(null);
         return;
     }

     if (element) {
         const tempWrapper = doc.createElement('div');
         tempWrapper.innerHTML = newHtml;
         const newElement = tempWrapper.firstChild;
         if (newElement) {
            element.replaceWith(newElement);
            const newFileContent = `<!DOCTYPE html>\n` + doc.documentElement.outerHTML;
            const newFs = { ...fileSystem, [htmlPath]: newFileContent };
            setFileSystem(newFs, true);
         }
     } else {
         console.warn(`Could not find element to save. Selector: ${selector}, ID: ${elementId}`);
     }

     setEditingElementInfo(null);
  };

  const handleTerminalSubmit = async (command: string) => {
    const commandId = uuidv4();
    const newHistoryLine: TerminalLine = { id: commandId, command, cwd: terminalCwd };
    addTerminalLine(newHistoryLine);
    setIsTerminalLoading(true);

    try {
        const result = await runCommandInTerminal(command, terminalCwd, fileSystem);
        
        updateTerminalLine({ id: commandId, stdout: result.stdout, stderr: result.stderr });
        setTerminalCwd(result.newCurrentDirectory);

        if (result.fileSystemChanges && result.fileSystemChanges.length > 0) {
            let newFs = { ...fileSystem };
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
            setFileSystem(newFs, true);
        }
    } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'An unknown error occurred.';
        updateTerminalLine({ id: commandId, stderr: `Execution failed: ${errorMsg}` });
    } finally {
        setIsTerminalLoading(false);
    }
  };

  const handleGithubConnect = async (token: string) => {
      setError('');
      setIsLoading(true);
      try {
          const user = await githubService.connect(token);
          const repos = await githubService.listRepos();
          setGithubState({
              isGithubConnected: true,
              githubUser: user,
              githubRepos: repos,
          });
      } catch (e: any) {
          setError(e.message);
          store.setGithubToken('');
          githubService.disconnect();
      } finally {
          setIsLoading(false);
      }
  };

  const handleGithubDisconnect = () => {
      githubService.disconnect();
      store.setGithubToken('');
      setGithubState({
        isGithubConnected: false,
        githubUser: null,
        githubRepos: [],
        selectedRepoFullName: '',
        repoBranches: [],
        selectedBranchName: '',
        initialGithubFileSystem: null,
        changedFiles: [],
        gitTree: [],
      });
  };

  const handleRepoSelected = async (repoFullName: string) => {
    setGithubState({ selectedRepoFullName: repoFullName, selectedBranchName: '', repoBranches: [] });
    if (repoFullName) {
        setIsLoading(true);
        setError('');
        try {
            const [owner, repo] = repoFullName.split('/');
            const branches = await githubService.listBranches(owner, repo);
            setGithubState({ repoBranches: branches });
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }
  };
  
  const handleLoadRepo = async () => {
    if (!store.selectedRepoFullName || !store.selectedBranchName) return;
    setGithubState({ isLoadingFromGithub: true, gitTree: [], fileSystem: {}, initialGithubFileSystem: {} });
    setIsLoading(true);
    setLoadingMessage('Loading repository tree...');
    setError('');
    try {
        const [owner, repo] = store.selectedRepoFullName.split('/');
        const tree = await githubService.getRepoTree(owner, repo, store.selectedBranchName);

        const fs: FileSystemState = {};
        tree.forEach(item => {
            fs[`/${item.path}`] = null;
        });

        setFileSystem(fs, true);
        setGithubState({
            initialGithubFileSystem: { ...fs },
            changedFiles: [],
            gitTree: tree
        });

        const readmePath = Object.keys(fs).find(p => p.toLowerCase().endsWith('readme.md'));
        const htmlPath = Object.keys(fs).find(p => p.toLowerCase().endsWith('index.html'));
        const filesToOpen = [readmePath, htmlPath].filter(Boolean) as string[];

        setOpenFiles(filesToOpen);

        if (filesToOpen.length > 0) {
            await handleFileSelect(filesToOpen[0]);
        } else {
             setActiveFile(null);
        }

        setPreviewRoot('/');
    } catch(e: any) {
        setError(`Failed to load repo: ${e.message}`);
    } finally {
        setGithubState({ isLoadingFromGithub: false });
        setIsLoading(false);
        setLoadingMessage('');
    }
  };
  
  const handleCommitAndPush = async (message: string) => {
      if (!store.selectedRepoFullName || !store.selectedBranchName || !initialGithubFileSystem) return;

      setIsLoading(true);
      setLoadingMessage('Committing and pushing to GitHub...');
      setError('');
      try {
          const [owner, repo] = store.selectedRepoFullName.split('/');
          const commitUrl = await githubService.commitAndPush(
              owner,
              repo,
              store.selectedBranchName,
              message,
              store.changedFiles,
              fileSystem,
          );
          setGithubState({ initialGithubFileSystem: fileSystem, changedFiles: [] });
          alert(`Successfully pushed to GitHub! Commit URL: ${commitUrl}`);
      } catch (e: any) {
          setError(`Commit failed: ${e.message}`);
      } finally {
          setIsLoading(false);
          setLoadingMessage('');
      }
  };
  
  const handleChatSubmit = async (e: React.FormEvent, prompt?: string) => {
        if(e) e.preventDefault();
        const userInput = prompt || cliInput;
        if (!userInput.trim() || isLoading) return;

        const newUserMessage: ChatMessage = { role: 'user', content: userInput };
        addChatMessage(newUserMessage);
        const newHistory = [...chatHistory, newUserMessage];
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
            addChatMessage(modelMessage);

        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
            setError(`Agent Error: ${errorMessage}`);
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
                        <LightbulbIcon className="h-4 w-4 text-yellow-400" />
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
                setChatPanelHeight(e.clientY > 150 ? e.clientY : 150);
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
                          onSetPreviewRoot={setPreviewRoot}
                          onDownloadProject={handleDownloadProject}
                          onRefresh={updatePreview}
                      />
                  </CollapsibleSection>
                  <CollapsibleSection title="GitHub">
                      <GithubPanel
                        isLoading={isLoading || store.isLoadingFromGithub}
                        onConnect={handleGithubConnect}
                        onDisconnect={handleGithubDisconnect}
                        onRepoSelected={handleRepoSelected}
                        onBranchSelected={(branch) => setGithubState({ selectedBranchName: branch })}
                        onLoadRepo={handleLoadRepo}
                        onCommit={handleCommitAndPush}
                      />
                  </CollapsibleSection>
                  <CollapsibleSection title="System Operator">
                    <SystemOperatorPanel
                        fileSystem={fileSystem}
                        onUpdateFileSystem={(newFs, snapshot) => setFileSystem(newFs, snapshot)}
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
                                  onChange={(newCode) => setFileSystem({ ...fileSystem, [activeFile]: newCode }, false)}
                                  onSave={() => useStore.getState().saveState()}
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
      
      {!isFocusMode && <OrbMenu onToggleFocusMode={onToggleFocusMode} />}

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