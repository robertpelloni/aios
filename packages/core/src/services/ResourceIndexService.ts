import fs from 'fs';
import path from 'path';

interface ResourceIndexItem {
  url: string;
  category: string;
  path: string;
  researched: boolean;
  summary: string;
  features: string[];
  last_updated: string;
}

export class ResourceIndexService {
  private indexPath: string;
  private resources: ResourceIndexItem[] = [];

  constructor(rootDir: string) {
    this.indexPath = path.join(rootDir, 'data', 'resource-index.json');
    this.loadIndex();
  }

  private loadIndex() {
    if (fs.existsSync(this.indexPath)) {
      try {
        const content = fs.readFileSync(this.indexPath, 'utf-8');
        this.resources = JSON.parse(content);
      } catch (e) {
        console.error('Failed to load resource index:', e);
        this.resources = [];
      }
    }
  }

  public getResources(): ResourceIndexItem[] {
    // Reload on request to ensure fresh data if modified by scripts
    this.loadIndex();
    return this.resources;
  }

  public getResourceByUrl(url: string): ResourceIndexItem | undefined {
    return this.resources.find(r => r.url === url);
  }

  public updateResource(url: string, updates: Partial<ResourceIndexItem>) {
    this.loadIndex();
    const index = this.resources.findIndex(r => r.url === url);
    if (index !== -1) {
      this.resources[index] = { ...this.resources[index], ...updates, last_updated: new Date().toISOString() };
      this.saveIndex();
      return true;
    }
    return false;
  }

  private saveIndex() {
    try {
      fs.writeFileSync(this.indexPath, JSON.stringify(this.resources, null, 2));
    } catch (e) {
      console.error('Failed to save resource index:', e);
    }
  }
}
