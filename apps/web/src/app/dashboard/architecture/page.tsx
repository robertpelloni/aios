
import React from 'react';

export default function ArchitecturePage() {
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

                {/* Submodules List (Mock for now, to be populated dynamically) */}
                <div className="p-6 border rounded-lg bg-zinc-900 border-zinc-700">
                    <h2 className="text-xl font-semibold mb-4 text-blue-400">Integrated Submodules</h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead className="bg-zinc-800 text-zinc-400">
                                <tr>
                                    <th className="px-4 py-2">Name</th>
                                    <th className="px-4 py-2">Path</th>
                                    <th className="px-4 py-2">Version/Ref</th>
                                    <th className="px-4 py-2">Last Update</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-700 text-zinc-300">
                                <tr>
                                    <td className="px-4 py-2 font-medium">@borg/core</td>
                                    <td className="px-4 py-2">packages/core</td>
                                    <td className="px-4 py-2">v1.3.0</td>
                                    <td className="px-4 py-2">2026-01-24</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-2 font-medium">jules-autopilot</td>
                                    <td className="px-4 py-2">external/jules-autopilot</td>
                                    <td className="px-4 py-2 text-yellow-500">Pending</td>
                                    <td className="px-4 py-2">-</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-2 font-medium">awesome-mcp-servers</td>
                                    <td className="px-4 py-2">references/awesome-mcp-servers</td>
                                    <td className="px-4 py-2 text-yellow-500">Pending</td>
                                    <td className="px-4 py-2">-</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
