import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const resourcesListPath = path.join(process.cwd(), 'scripts', 'resources-list.json');
const resourceIndexPath = path.join(process.cwd(), 'packages', 'core', 'src', 'data', 'resource-index.json');

// Ensure data directory exists
const dataDir = path.dirname(resourceIndexPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

interface ResourceCategory {
  category: string;
  path: string;
  links: string[];
}

interface ResourceIndexItem {
  url: string;
  category: string;
  path: string;
  researched: boolean;
  summary: string;
  features: string[];
  last_updated: string;
}

let resourceIndex: ResourceIndexItem[] = [];
if (fs.existsSync(resourceIndexPath)) {
  try {
    const content = fs.readFileSync(resourceIndexPath, 'utf-8');
    resourceIndex = JSON.parse(content);
    // Filter out the initial placeholder if it exists
    resourceIndex = resourceIndex.filter(item => item.url !== "");
  } catch (e) {
    console.error("Error reading resource index, starting fresh.");
  }
}

const resourcesList: ResourceCategory[] = JSON.parse(fs.readFileSync(resourcesListPath, 'utf-8'));

console.log("Starting submodule import...");

for (const group of resourcesList) {
  const targetDir = path.join(process.cwd(), group.path);
  
  // Ensure target category directory exists
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  for (const link of group.links) {
    // cleanliness check
    if (!link.startsWith('https://github.com')) {
        console.log(`Skipping non-github link: ${link}`);
        continue;
    }

    const repoName = link.split('/').pop()?.replace('.git', '') || 'repo';
    const submodulePath = path.join(group.path, repoName);
    const fullPath = path.join(process.cwd(), submodulePath);

    // Update index
    const existingIndex = resourceIndex.find(r => r.url === link);
    if (!existingIndex) {
      resourceIndex.push({
        url: link,
        category: group.category,
        path: submodulePath,
        researched: false,
        summary: "",
        features: [],
        last_updated: new Date().toISOString()
      });
    }

    if (fs.existsSync(fullPath)) {
      console.log(`Skipping existing submodule: ${submodulePath}`);
      continue;
    }

    try {
      console.log(`Adding submodule: ${link} -> ${submodulePath}`);
      // Use force to avoid issues with ignored paths, but handle with care
      execSync(`git submodule add --force "${link}" "${submodulePath}"`, { stdio: 'inherit' });
    } catch (error) {
      console.error(`Failed to add submodule ${link}:`, error);
      // Don't crash, just continue
    }
  }
}

fs.writeFileSync(resourceIndexPath, JSON.stringify(resourceIndex, null, 2));
console.log("Import complete. Resource index updated.");
