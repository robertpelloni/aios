import { EventEmitter } from 'events';
import path from 'path';
import { RepoMapService } from './RepoMapService.js';

export interface GraphNode {
  id: string; // Relative path
  label: string; // File name
  type: string; // Extension/Language
  metadata: {
    exports: string[];
    imports: string[];
    symbols: string[];
  };
}

export interface GraphEdge {
  source: string;
  target: string;
  type: 'import' | 'inheritance' | 'dependency';
}

export interface RepoGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export class RepoGraphService extends EventEmitter {
  private static instance: RepoGraphService;
  private repoMapService: RepoMapService;

  private constructor() {
    super();
    this.repoMapService = RepoMapService.getInstance();
  }

  static getInstance(): RepoGraphService {
    if (!RepoGraphService.instance) {
      RepoGraphService.instance = new RepoGraphService();
    }
    return RepoGraphService.instance;
  }

  async generateGraph(rootDir: string): Promise<RepoGraph> {
    const repoMap = await this.repoMapService.generateRepoMap(rootDir);
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // Create Nodes
    for (const file of repoMap.files) {
      nodes.push({
        id: file.relativePath,
        label: path.basename(file.relativePath),
        type: file.language,
        metadata: {
          exports: file.exports,
          imports: file.imports,
          symbols: file.symbols.map(s => s.name)
        }
      });
    }

    // Create Edges based on imports
    for (const file of repoMap.files) {
      for (const importPath of file.imports) {
        const resolved = this.resolveImport(file.relativePath, importPath, nodes.map(n => n.id));
        if (resolved) {
          edges.push({
            source: file.relativePath,
            target: resolved,
            type: 'import'
          });
        }
      }
    }

    return { nodes, edges };
  }

  private resolveImport(sourcePath: string, importPath: string, allFiles: string[]): string | null {
    // Very simple resolution for now (matching relative paths or exact module paths)
    // In a real implementation, we'd use language-specific resolution logic
    const sourceDir = path.dirname(sourcePath);
    
    // 1. Try relative resolution
    if (importPath.startsWith('.')) {
      const absoluteTarget = path.normalize(path.join(sourceDir, importPath)).replace(/\\/g, '/');
      // Try extensions
      for (const ext of ['', '.ts', '.tsx', '.js', '.jsx', '.py', '.rs', '.go']) {
        const candidate = (absoluteTarget + ext).replace(/^\.\//, '');
        if (allFiles.includes(candidate)) return candidate;
      }
    }

    // 2. Try matching any file that ends with the import path
    const normalizedImport = importPath.replace(/\\/g, '/');
    for (const file of allFiles) {
      if (file.endsWith(normalizedImport) || file.endsWith(normalizedImport + '.ts') || file.endsWith(normalizedImport + '.js')) {
        return file;
      }
    }

    return null;
  }
}
