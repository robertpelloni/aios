"use client";

import React from 'react';
import { trpc } from '@/utils/trpc';

export default function ArchitecturePage() {
    const { data: submodules, isLoading } = trpc.git.getSubmodules.useQuery();

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Project Architecture & Submodules</h1>

            <div className="space-y-6">
                {/* Project Structure */}
                <div className="p-6 border rounded-lg bg-zinc-900 border-zinc-700">
                    <h2 className="text-xl font-semibold mb-4 text-emerald-400">Directory Structure</h2>
                    <pre className="text-sm font-mono text-zinc-300 overflow-x-auto whitespace-pre">
                        {`
/apps
  /web              # Next.js Dashboard (Frontend)
  /extension        # Chrome Extension (Browser Client)
  
/packages
  /core             # Core Agentic Framework (MCPServer, Director, Memory)
  /cli              # CLI functionality (borg start, borg doctor)
  /vscode           # VS Code Extension (Editor Interface)
  
/dockers
  /borg-server      # Containerized Deployment
  
/docs               # Documentation & Research
`}
                    </pre>
                </div>

                {/* Submodules List from Git */}
                <div className="p-6 border rounded-lg bg-zinc-900 border-zinc-700">
                    <h2 className="text-xl font-semibold mb-4 text-blue-400">Integrated Submodules (Live)</h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead className="bg-zinc-800 text-zinc-400">
                                <tr>
                                    <th className="px-4 py-2">Name</th>
                                    <th className="px-4 py-2">Path</th>
                                    <th className="px-4 py-2">URL</th>
                                    <th className="px-4 py-2">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-700 text-zinc-300">
                                {isLoading ? (
                                    <tr><td colSpan={4} className="px-4 py-4 text-center">Loading git modules...</td></tr>
                                ) : submodules?.map((mod: any) => (
                                    <tr key={mod.path}>
                                        <td className="px-4 py-2 font-medium">{mod.name}</td>
                                        <td className="px-4 py-2">{mod.path}</td>
                                        <td className="px-4 py-2 text-zinc-500 truncate max-w-xs">{mod.url}</td>
                                        <td className="px-4 py-2 text-emerald-500">Active</td>
                                    </tr>
                                ))}
                                {submodules && submodules.length === 0 && (
                                    <tr><td colSpan={4} className="px-4 py-4 text-center text-zinc-500">No submodules found (.gitmodules empty)</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                {/* Dependency Graph */}
                <div className="p-6 border rounded-lg bg-zinc-900 border-zinc-700">
                    <h2 className="text-xl font-semibold mb-4 text-purple-400">Deep Code Intelligence Graph</h2>

                    <GraphVisualizer />
                </div>

                {/* Auto-Test Health */}
                <div className="p-6 border rounded-lg bg-zinc-900 border-zinc-700">
                    <h2 className="text-xl font-semibold mb-4 text-rose-400">Auto-Test Health</h2>
                    <AutoTestWidget />
                </div>
            </div>
        </div>
    );
}

import Mermaid from '@/components/Mermaid';

function GraphVisualizer() {
    const { data: graph, isLoading } = trpc.repoGraph.get.useQuery();
    const [mermaidSrc, setMermaidSrc] = React.useState('');

    React.useEffect(() => {
        if (!graph) return;

        let src = 'graph TD\n';
        // Limit nodes for performance/visual clarity
        const nodes = Object.keys(graph.dependencies).slice(0, 50); // Top 50 modules

        nodes.forEach(node => {
            const cleanNode = node.replace(/[^a-zA-Z0-9]/g, '_');
            src += `    ${cleanNode}["${node.split('/').pop()}"]\n`;

            const deps = graph.dependencies[node] || [];
            deps.forEach((dep: string) => {
                if (nodes.includes(dep)) {
                    const cleanDep = dep.replace(/[^a-zA-Z0-9]/g, '_');
                    src += `    ${cleanNode} --> ${cleanDep}\n`;
                }
            });
        });

        if (nodes.length === 0) src += '    Start --> End\n';

        setMermaidSrc(src);
    }, [graph]);

    if (isLoading) return <div className="text-zinc-500">Loading Intelligence Graph...</div>;

    return (
        <div className="w-full">
            <Mermaid chart={mermaidSrc} />
        </div>
    );
}

function AutoTestWidget() {
    const { data: results, isLoading } = trpc.autoTest.getResults.useQuery(undefined, { refetchInterval: 2000 });

    if (isLoading) return <div className="text-zinc-500">Loading Test Results...</div>;

    // Sort: Failures first
    const sorted = Object.entries(results || {}).sort((a: any, b: any) => {
        if (a[1].status === 'fail' && b[1].status !== 'fail') return -1;
        if (b[1].status === 'fail' && a[1].status !== 'fail') return 1;
        return b[1].timestamp - a[1].timestamp;
    });

    if (sorted.length === 0) return <div className="text-zinc-500 italic">No tests have run yet. Save a file to trigger.</div>;

    return (
        <div className="space-y-2 max-h-60 overflow-y-auto">
            {sorted.map(([path, info]: any) => (
                <div key={path} className="flex justify-between items-center bg-black/20 p-2 rounded text-xs">
                    <span className="truncate max-w-[70%] font-mono text-zinc-300">{path.split('\\').pop()?.split('/').pop()}</span>
                    <span className={`px-2 py-1 rounded font-bold ${info.status === 'pass' ? 'bg-emerald-900 text-emerald-300' :
                        info.status === 'fail' ? 'bg-rose-900 text-rose-300' :
                            'bg-blue-900 text-blue-300 animate-pulse'
                        }`}>
                        {info.status.toUpperCase()}
                    </span>
                </div>
            ))}
        </div>
    );
}
