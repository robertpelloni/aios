import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Database, RefreshCw, HardDrive, Cloud } from 'lucide-react';

interface MemoryProvider {
  id: string;
  name: string;
  type: string;
  capabilities: string[];
}

interface MemoryItem {
  id: string;
  content: string;
  tags: string[];
  timestamp: number;
  sourceProvider: string;
}

export default function MemoryPage() {
  const [providers, setProviders] = useState<MemoryProvider[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    // Mock for now, replace with actual API call
    // const res = await fetch('/api/memory/providers');
    // const data = await res.json();
    setProviders([
        { id: 'default-file', name: 'Local File Storage', type: 'file', capabilities: ['read', 'write', 'search'] },
        { id: 'mem0', name: 'Mem0 (Cloud)', type: 'vector', capabilities: ['read', 'write'] }
    ]);
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
        // Mock search
        // const res = await fetch(`/api/memory/search?query=${searchQuery}`);
        setMemories([
            { id: '1', content: 'User prefers TypeScript over Python.', tags: ['preference'], timestamp: Date.now(), sourceProvider: 'default-file' },
            { id: '2', content: 'Project uses pnpm workspaces.', tags: ['fact'], timestamp: Date.now(), sourceProvider: 'default-file' }
        ]);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Memory Orchestrator</h1>
        <Button onClick={fetchProviders} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Provider Status */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center">
                <Database className="mr-2 h-5 w-5" /> Providers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {providers.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center">
                        {p.type === 'file' ? <HardDrive className="mr-2 h-4 w-4 text-blue-500" /> : <Cloud className="mr-2 h-4 w-4 text-purple-500" />}
                        <div>
                            <div className="font-medium">{p.name}</div>
                            <div className="text-xs text-muted-foreground capitalize">{p.type}</div>
                        </div>
                    </div>
                    <Badge variant="secondary">Connected</Badge>
                </div>
            ))}
            <Button className="w-full" variant="ghost">Add Provider</Button>
          </CardContent>
        </Card>

        {/* Memory Explorer */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Explorer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
                <Input 
                    placeholder="Search memories..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={loading}>
                    <Search className="h-4 w-4" />
                </Button>
            </div>

            <ScrollArea className="h-[400px]">
                {memories.length === 0 ? (
                    <div className="text-center text-muted-foreground py-10">
                        No memories found. Try searching.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {memories.map(m => (
                            <div key={m.id} className="p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                                <div className="text-sm">{m.content}</div>
                                <div className="flex items-center justify-between mt-2">
                                    <div className="flex gap-1">
                                        {m.tags.map(t => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {new Date(m.timestamp).toLocaleDateString()} • {m.sourceProvider}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
