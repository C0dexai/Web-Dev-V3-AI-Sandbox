export type FileSystemState = Record<string, string | null>;

export interface TreeItem {
    path: string;
    sha: string;
    type: 'blob' | 'tree';
}

export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  content: string;
  explanation?: string;
  code?: { path: string; content: string; }[];
  suggestions?: string[];
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
  content?: string;
}

export interface TerminalExecutionResult {
    stdout: string;
    stderr: string;
    newCurrentDirectory: string;
    fileSystemChanges: FileSystemChangeAction[];
}

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
  at: string;
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
  created_at: string;
  history: HandoverHistoryItem[];
}

export interface Container {
  id: string;
  path: string;
  handover: Handover;
}
