"use client";

import React from 'react';
import { trpc } from '../utils/trpc';

export function TestStatusWidget() {
    const { data: results } = trpc.autotest.getResults.useQuery(undefined, { refetchInterval: 2000 });
    const { data: status, refetch: refetchStatus } = trpc.autotest.getStatus.useQuery();

    const utils = trpc.useContext();
    const startMutation = trpc.autotest.start.useMutation({
        onSuccess: () => { refetchStatus(); }
    });
    const stopMutation = trpc.autotest.stop.useMutation({
        onSuccess: () => { refetchStatus(); }
    });
    // @ts-ignore
    const clearMutation = (trpc as any).autotest.clear.useMutation({
        onSuccess: () => {
            // @ts-ignore
            (utils as any).autotest.getResults.invalidate();
        }
    });

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-mono font-semibold text-pink-400">🧪 Auto-Test Watcher</h3>
                <div className="flex gap-2">
                    {!status?.isRunning ? (
                        <button
                            onClick={() => startMutation.mutate()}
                            className="bg-green-700 hover:bg-green-600 text-white px-2 py-0.5 rounded text-xs"
                        >
                            Start
                        </button>
                    ) : (
                        <button
                            onClick={() => stopMutation.mutate()}
                            className="bg-yellow-700 hover:bg-yellow-600 text-white px-2 py-0.5 rounded text-xs"
                        >
                            Stop
                        </button>
                    )}
                    <button
                        onClick={() => clearMutation.mutate()}
                        className="text-gray-500 hover:text-gray-300 text-xs"
                    >
                        Clear
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 font-mono text-xs">
                {results && results.length > 0 ? (
                    results.map((r: any) => (
                        <div key={r.file} className="flex flex-col bg-gray-800/50 p-2 rounded">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-gray-300 truncate" title={r.file}>
                                    {r.file.split(/[\\/]/).pop()}
                                    <span className="text-gray-600 ml-2 text-[10px]">{r.file}</span>
                                </span>
                                <span className={`font-bold ${r.status === 'pass' ? 'text-green-400' :
                                    r.status === 'fail' ? 'text-red-400' :
                                        'text-blue-400 animate-pulse'
                                    }`}>
                                    {r.status.toUpperCase()}
                                </span>
                            </div>
                            {r.status === 'fail' && r.output && (
                                <pre className="text-red-300 bg-black/50 p-1 rounded overflow-x-auto text-[10px]">
                                    {r.output.substring(0, 300)}...
                                </pre>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="text-gray-600 italic text-center mt-4">
                        {status?.isRunning ? "Watching for changes..." : "Watcher stopped."}
                    </div>
                )}
            </div>
        </div>
    );
}
