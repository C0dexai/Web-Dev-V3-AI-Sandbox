export type FileSystemState = Record<string, string>;

export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  content: string; // For user message, system message, or model's brief conversational text
  explanation?: string; // For model's detailed explanation of code, formatted in markdown
  code?: { path: string; content: string; }[]; // Can contain updates for multiple files
  suggestions?: string[]; // Optional list of follow-up prompts
}

export interface DraggableComponent {
  id: string;
  name: string;
  html: string;
}

export interface GithubRepo {
  name: string;
  full_name: string;
  owner: {
    login: string;
  };
}

export interface GithubBranch {
  name: string;
  commit: {
    sha: string;
  };
}

export interface GithubUser {
    login: string;
    avatar_url: string;
    html_url: string;
}

export interface FileChange {
  path: string;
  status: 'modified' | 'added' | 'deleted';
}

export interface TerminalLine {
  id: string;
  command: string;
  stdout?: string;
  stderr?: string;
  cwd: string;
}

export interface FileSystemChangeAction {
  action: 'create' | 'update' | 'delete';
  path: string;
  content?: string; // only for create/update
}

export interface TerminalExecutionResult {
    stdout: string;
    stderr: string;
    newCurrentDirectory: string;
    fileSystemChanges: FileSystemChangeAction[];
}

// System Operator Types
export interface TemplateInfo {
  path: string;
  tags: string[];
}

export interface TemplateRegistry {
  TEMPLATES: Record<string, TemplateInfo>;
  UI: Record<string, TemplateInfo>;
  DATASTORE: Record<string, TemplateInfo>;
}

export interface HandoverHistoryItem {
  action: 'create' | 'command' | 'feature-add' | 'debug';
  by: string;
  at: string; // ISO string
  details: {
    command?: string;
    status?: 'success' | 'failure';
    error?: string;
    feature?: string;
    env?: { [key: string]: string };
    [key: string]: any;
  }
}

export interface Handover {
  container_id: string;
  operator: string;
  prompt: string;
  chosen_templates: {
    base: string;
    ui: string[];
    datastore: string;
  };
  env?: {
    [key: string]: string;
  };
  status: 'initialized' | 'installing' | 'building' | 'running' | 'error';
  created_at: string; // ISO string
  history: HandoverHistoryItem[];
}

export interface Container {
  id: string;
  path: string;
  handover: Handover;
}