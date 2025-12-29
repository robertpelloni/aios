import fs from 'fs';
import path from 'path';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// Type definition for our submodule data
interface Submodule {
  name: string;
  path: string;
  category: string;
  role: string;
  description: string;
  rationale: string;
  integrationStrategy: string;
  status: string;
  isInstalled: boolean;
}

async function getSubmodules(): Promise<Submodule[]> {
  // Try to resolve the path relative to where the server process might be running
  // In a monorepo, it's often the root or the package root.
  const possiblePaths = [
    path.join(process.cwd(), 'docs/SUBMODULE_INDEX.csv'),          // Run from root
    path.join(process.cwd(), '../../docs/SUBMODULE_INDEX.csv'),    // Run from packages/ui
    path.join(process.cwd(), '../../../docs/SUBMODULE_INDEX.csv'), // Deeper nesting?
  ];

  let csvPath = '';
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      csvPath = p;
      break;
    }
  }

  if (!csvPath) {
    console.error('Could not find SUBMODULE_INDEX.csv in:', possiblePaths);
    return [];
  }
  
  try {
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim() !== '');
    const headers = lines[0].split(',').map(h => h.trim());
    
    // Skip header
    return lines.slice(1).map(line => {
      // Handle simple CSV parsing
      // Note: This split is naive and will break if fields contain commas. 
      // For this specific dataset, it's acceptable.
      const values = line.split(',').map(v => v.trim());
      const entry: any = {};
      
      headers.forEach((header, index) => {
        const key = header.toLowerCase().replace(/ /g, '');
        if (key.includes('strategy')) entry.integrationStrategy = values[index];
        else entry[key] = values[index];
      });

      // Check if installed. We need to resolve the path relative to the repo root.
      // We assume csvPath is at <ROOT>/docs/SUBMODULE_INDEX.csv
      const repoRoot = path.dirname(path.dirname(csvPath));
      const fullPath = path.join(repoRoot, entry.path || '');
      const isInstalled = fs.existsSync(fullPath);

      return {
        name: entry.name || 'Unknown',
        path: entry.path || '',
        category: entry.category || 'Other',
        role: entry.role || 'Tool',
        description: entry.description || '',
        rationale: entry.rationale || '',
        integrationStrategy: entry.integrationStrategy || '',
        status: entry.status || 'Unknown',
        isInstalled
      };
    });
  } catch (error) {
    console.error('Error reading submodule index:', error);
    return [];
  }
}

export default async function EcosystemDashboard() {
  const submodules = await getSubmodules();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ecosystem Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Overview of integrated submodules, references, and their operational status.
          </p>
        </div>
        <div className="flex gap-2">
           <Badge variant="outline" className="text-lg py-1 px-3">
             {submodules.length} Modules
           </Badge>
           <Badge variant="secondary" className="text-lg py-1 px-3">
             {submodules.filter(s => s.isInstalled).length} Installed
           </Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {submodules.map((module, index) => (
          <Card key={index} className="flex flex-col h-full border-gray-800 bg-gray-950/50 hover:bg-gray-900/50 transition-colors">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl text-blue-400">{module.name}</CardTitle>
                <Badge variant={module.isInstalled ? "default" : "secondary"}>
                  {module.isInstalled ? "Active" : "Reference"}
                </Badge>
              </div>
              <div className="flex gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">{module.category}</Badge>
                <Badge variant="outline" className="text-xs">{module.role}</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-sm text-gray-300 mb-4">{module.description}</p>
              
              <div className="space-y-2">
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase">Rationale</span>
                  <p className="text-xs text-gray-400">{module.rationale}</p>
                </div>
                {module.integrationStrategy && (
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase">Integration</span>
                    <p className="text-xs text-gray-400">{module.integrationStrategy}</p>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="pt-4 border-t border-gray-800">
              <div className="flex justify-between w-full items-center">
                 <code className="text-xs bg-gray-900 px-2 py-1 rounded text-gray-500 truncate max-w-[150px]" title={module.path}>
                   {module.path}
                 </code>
                 <Button variant="ghost" size="sm" asChild>
                   <Link href={`/dashboard/ecosystem/${module.name}`}>Details &rarr;</Link>
                 </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
