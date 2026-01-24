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
            </div>
        </div>
    );
}
