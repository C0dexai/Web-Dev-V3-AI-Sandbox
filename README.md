# Live Web Dev Sandbox with Gemini AI & GitHub Integration

This is a powerful, browser-based development environment that combines the creative power of the Google Gemini AI with the version control capabilities of GitHub. It allows you to generate, edit, and manage full web projects using natural language, and then commit your work directly to a repository.

---

## Key Features

-   **System Operator Build Process**: Orchestrate entire project builds from a registry of templates (React, Tailwind, etc.). Each build is a "container" with its own state and history.
-   **AI-Powered Development**: Instruct the Gemini agent to create files, write HTML, style with CSS/TailwindCSS, and add JavaScript functionality.
-   **Full GitHub Integration**: Connect your GitHub account, load repositories, browse branches, and commit & push changes directly from the app.
-   **Simulated WebContainer Terminal**: An AI-powered terminal that understands common shell commands (`ls`, `cd`, `npm install`, `npm run build`) to orchestrate project changes.
-   **Live Preview & Editing**: See your changes reflected instantly. Click on elements to edit them directly in the preview.
-   **Complete File Management**: A familiar file explorer with support for creating files/folders, uploading (including ZIP archives), and downloading your entire project.

---

## First Run & Quick Start

1.  **Connect to GitHub (Optional but Recommended)**:
    *   Go to the "GitHub" panel on the left.
    *   Enter a [GitHub Personal Access Token (PAT)](https://github.com/settings/tokens?type=beta) with `repo` scope. **Your token is stored securely in your browser's local storage and is never exposed.**
    *   Click "Connect" to load your repositories.

2.  **Create a Project Container**:
    *   Go to the "System Operator" panel on the left.
    *   Click "Create New Container".
    *   Give your operator a name, describe your goal (e.g., "A simple todo app"), and select your templates (e.g., React, Tailwind).
    *   Click "Create Container". This will create a new project in the `/containers/` directory.

3.  **Build Your Project**:
    *   In the new container's card, click **Install** to simulate `npm install`.
    *   Then click **Build** to simulate `npm run build`.
    *   Set the container's directory (e.g., `/containers/container_xyz/`) as the **Preview Root** in the File Explorer to see it live.

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

-   **Containers**: Each project is a self-contained unit. The file system, dependencies (`package.json`), and build history (`handover.json`) are stored within its directory in `/containers/`.
-   **Template Registry**: The build process uses a file-based registry located in the `/templates` directory. The AI is aware of `/templates/registry.json` and can use it to assemble new projects based on your requests. You can extend the system by adding new templates to this directory.
-   **Build Commands**: The `Install`, `Build`, and `Start` buttons use the AI-powered terminal to simulate the respective `npm` commands, updating the file system and logging the results in the container's `handover.json`.

### The Simulated Terminal (WebContainer)

The "Terminal" tab provides a command-line interface powered by a Gemini agent.

-   **How it works**: When you run a command like `npm run build`, the command is sent to the Gemini agent. The agent reads the project files (like `package.json` and `vite.config.js`), understands what the build process would do, and returns a *simulated* output, including creating a `/dist` directory.
-   **What it's for**: It's a powerful tool for AI-driven orchestration. It allows the System Operator panel and the chat agent to manage project structure and dependencies without a real execution environment.
-   **Limitations**: It does **not** actually execute code, run a live server, or access the network. It's a high-level simulation.

---

## How to Administer, Maintain, and Distribute this Application

This application is a fully client-side static web application.

1.  **Sourcing & Maintenance**:
    *   The "source" is the GitHub repository containing these files.
    *   To "maintain" the application, you make changes to the code (e.g., updating React components, improving Gemini prompts in `geminiService.ts`) and commit them.

2.  **Administration**:
    *   The primary configuration is the **API Key**. The `GoogleGenAI` client is initialized with `process.env.API_KEY`. When you deploy the application, you must set this as an environment variable in your hosting provider's settings.

3.  **Distribution (Deployment)**:
    *   Deploy this static application to any modern web hosting platform like Vercel, Netlify, or GitHub Pages.
    *   **Deployment Steps (Example with Vercel)**:
        1.  Fork this repository.
        2.  Go to Vercel and create a new project, linking it to your forked repository.
        3.  In Vercel's project settings, add an Environment Variable named `API_KEY` with your Google AI Studio API key as the value.
        4.  Deploy. Vercel will build and host your application at a public URL.

Anyone with the URL can now use your version of the Live Dev Sandbox.
