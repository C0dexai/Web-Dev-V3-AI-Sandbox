import type { FileSystemState } from './types';

export const readmeContent = `# Live Web Dev Sandbox with Gemini AI & GitHub Integration

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

export const systemOperatorReadme = `# 🛠️ SYSTEM OPERATOR BUILD PROCESS

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

export const templateRegistry = `{
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

export const initialFileSystem: FileSystemState = {
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
