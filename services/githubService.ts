import { Octokit } from 'octokit';
import type { FileSystemState, GithubRepo, GithubBranch, GithubUser, FileChange, TreeItem } from '../types';

class GithubService {
    private octokit: Octokit | null = null;
    private repoCache: GithubRepo[] | null = null;
    private branchCache: Map<string, GithubBranch[]> = new Map();

    connect = async (token: string): Promise<GithubUser> => {
        this.octokit = new Octokit({ auth: token });
        try {
            const { data: user } = await this.octokit.rest.users.getAuthenticated();
            this.clearCache();
            return user;
        } catch (error) {
            this.disconnect();
            console.error("GitHub connection failed:", error);
            if (error instanceof Error && 'status' in error && error.status === 401) {
                throw new Error("Authentication failed. Please check your token and permissions.");
            }
            throw new Error("Failed to connect to GitHub.");
        }
    };

    disconnect = () => {
        this.octokit = null;
        this.clearCache();
    };

    private clearCache = () => {
        this.repoCache = null;
        this.branchCache.clear();
    };
    
    listRepos = async (): Promise<GithubRepo[]> => {
        if (!this.octokit) throw new Error("Not connected to GitHub.");
        if (this.repoCache) return this.repoCache;

        try {
            const { data: repos } = await this.octokit.rest.repos.listForAuthenticatedUser({
                type: 'owner',
                sort: 'pushed',
                per_page: 100,
            });
            this.repoCache = repos as GithubRepo[];
            return this.repoCache;
        } catch (error) {
            console.error("Failed to list repositories:", error);
            throw new Error("Could not retrieve repositories.");
        }
    };

    listBranches = async (owner: string, repo: string): Promise<GithubBranch[]> => {
        if (!this.octokit) throw new Error("Not connected to GitHub.");
        const cacheKey = `${owner}/${repo}`;
        if (this.branchCache.has(cacheKey)) {
            return this.branchCache.get(cacheKey)!;
        }

        try {
            const { data: branches } = await this.octokit.rest.repos.listBranches({
                owner,
                repo,
                per_page: 100,
            });
            this.branchCache.set(cacheKey, branches);
            return branches;
        } catch (error) {
            console.error(`Failed to list branches for ${owner}/${repo}:`, error);
            throw new Error("Could not retrieve branches for the selected repository.");
        }
    };

    getRepoTree = async (owner: string, repo: string, ref: string): Promise<TreeItem[]> => {
        if (!this.octokit) throw new Error("Not connected to GitHub.");
        try {
            const { data } = await this.octokit.rest.git.getTree({
                owner,
                repo,
                tree_sha: ref,
                recursive: '1',
            });
            return data.tree.filter(item => item.type === 'blob' && item.path) as TreeItem[];
        } catch (error) {
            console.error(`Failed to get repository tree for ${owner}/${repo}#${ref}:`, error);
            throw new Error("Could not retrieve the repository file structure.");
        }
    };

    getFileContent = async (owner: string, repo: string, fileSha: string): Promise<string> => {
        if (!this.octokit) throw new Error("Not connected to GitHub.");
        try {
            const { data: blob } = await this.octokit.rest.git.getBlob({
                owner,
                repo,
                file_sha: fileSha,
            });

            if (blob.encoding === 'base64') {
                return atob(blob.content);
            }
            return blob.content;
        } catch (error) {
            console.error(`Failed to fetch blob for sha ${fileSha}:`, error);
            throw new Error("Could not retrieve file content.");
        }
    };
    
    commitAndPush = async (
        owner: string,
        repo: string,
        branch: string,
        message: string,
        changes: FileChange[],
        currentFileSystem: FileSystemState
    ): Promise<string> => {
        if (!this.octokit) throw new Error("Not connected to GitHub.");

        try {
            const { data: branchData } = await this.octokit.rest.repos.getBranch({
                owner,
                repo,
                branch,
            });
            const latestCommitSha = branchData.commit.sha;
            const baseTreeSha = branchData.commit.commit.tree.sha;

            const treeItems = await Promise.all(
                changes.map(async (change) => {
                    if (change.status === 'added' || change.status === 'modified') {
                        const content = currentFileSystem[change.path];
                        const { data: blob } = await this.octokit!.rest.git.createBlob({
                            owner,
                            repo,
                            content,
                            encoding: 'utf-8',
                        });
                        return {
                            path: change.path.substring(1),
                            sha: blob.sha,
                            mode: '100644' as const,
                            type: 'blob' as const,
                        };
                    } else { // deleted
                        return {
                            path: change.path.substring(1),
                            sha: null, // This is how you delete a file in the Git tree
                            mode: '100644' as const,
                            type: 'blob' as const,
                        };
                    }
                })
            );

            const { data: newTree } = await this.octokit.rest.git.createTree({
                owner,
                repo,
                base_tree: baseTreeSha,
                tree: treeItems,
            });

            const { data: newCommit } = await this.octokit.rest.git.createCommit({
                owner,
                repo,
                message,
                tree: newTree.sha,
                parents: [latestCommitSha],
            });

            await this.octokit.rest.git.updateRef({
                owner,
                repo,
                ref: `heads/${branch}`,
                sha: newCommit.sha,
            });

            return newCommit.html_url || '';
        } catch (error) {
            console.error("Commit and push failed:", error);
            throw new Error("Failed to commit and push changes. Please check your permissions and the repository state.");
        }
    };
}

const githubService = new GithubService();
export default githubService;
