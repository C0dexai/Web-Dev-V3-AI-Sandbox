# 🛠️ SYSTEM OPERATOR BUILD PROCESS (Full With Syntax)

---

## 1. 📂 Directory Structure

```
/
  /templates
    /react-vite
    /vue
    /vite
    /typescript
    /vanilla
    /shadcn-ui
    /tailwind-css
    /datastore/indexeddb
    /datastore/json-store
    registry.json
  /containers
    /container_<id>
      /src
      /public
      package.json
      handover.json
      node_modules
      dist
```

---

## 2. 📒 Registry (static lookup)

An example `registry.json`:
```json
{
  "TEMPLATES": {
    "REACT": { "path": "/templates/react-vite", "tags": ["spa", "frontend", "vite"] },
    "VUE": { "path": "/templates/vue", "tags": ["spa", "frontend"] },
    "VITE": { "path": "/templates/vite", "tags": ["build", "bundler"] },
    "TYPESCRIPT": { "path": "/templates/typescript", "tags": ["typed", "frontend"] },
    "VANILLA": { "path": "/templates/vanilla", "tags": ["basic", "javascript"] }
  },
  "UI": {
    "SHADCN": { "path": "/templates/shadcn-ui", "tags": ["ui", "components"] },
    "TAILWIND": { "path": "/templates/tailwind-css", "tags": ["styles", "utility-css"] }
  },
  "DATASTORE": {
    "IndexedDB": { "path": "/templates/datastore/indexeddb", "tags": ["local", "browser-db"] },
    "JSONStore": { "path": "/templates/datastore/json-store", "tags": ["file", "object-store"] }
  }
}
```

---

## 3. ⚙️ Build Workflow (Syntax)

### Step 1 — Create Container

This is done via the UI in the "System Operator" panel. It generates:

*   `/containers/container_<id>/`
*   `handover.json` with history initialized.

---

### Step 2 — Install dependencies

Triggered by the "Install" button on a container card. This runs the equivalent of:
```bash
# Run inside container folder
npm install
```

➡️ Logged in `handover.json`:

```json
{
  "action": "command",
  "by": "operator_name",
  "at": "2024-08-16T18:45:15Z",
  "details": { "command": "npm install", "status": "success" }
}
```

---

### Step 3 — Build project

Triggered by the "Build" button. This runs:
```bash
npm run build
```

➡️ Produces a simulated `/dist` directory.

---

### Step 4 — Start container app

Triggered by the "Start" button. This runs:
```bash
npm start
```

➡️ Simulates running a local dev server.

---

### Step 5 — Add feature (Drop-In Adaptation)

The AI agent can be instructed to add features to an existing container.
> "Add Supabase Auth to my current container."

➡️ The agent should find the relevant template, copy files, and merge them into the container.
➡️ Updates `handover.json` with `"action": "feature-add"`.

---

## 4. 🧩 Debugging Syntax

The "Debug" button on a container card initiates a debug session.

It reads the last failed entry in `handover.json` and sends it to the chat agent with context for analysis and suggested fixes.

---

## 5. 📜 API Syntax (Container Management)

While the app is UI-driven, the underlying logic can be thought of as API calls to the AI-simulated terminal and file system.

### Create container (POST)
- **Action**: User fills out the "Create Container" form.
- **Payload**: `{ "operator": "...", "prompt": "...", "template": "REACT", ... }`
- **Result**: New files and directories are created in the virtual file system.

### Run command inside container (POST)
- **Action**: User clicks "Install", "Build", or "Start".
- **Payload**: `{ "command": "npm install", "cwd": "/containers/container_id" }`
- **Result**: A command is sent to the terminal agent, which returns simulated output and file system changes.

---

## 6. 🔮 Adaptation Plan

*   **Every container is self-contained** (src, package.json, handover.json).
*   **LLM Debugging** only runs when the Operator clicks "Debug".
*   **Registry-driven feature injection** keeps builds modular.
*   **Operator identity** is logged in `handover.json` for each container.
*   **History log (`handover.json`)** is the single source of truth for replay, audit, and debug.
