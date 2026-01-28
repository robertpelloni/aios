"use client";

import React from 'react';
import { trpc } from '../utils/trpc';

export function ShellHistoryWidget() {
    // @ts-ignore
    const { data: history, refetch } = (trpc as any).shell.getHistory.useQuery({ limit: 100 }, {
        refetchInterval: 5000
    });

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-mono font-semibold text-yellow-400">🐚 Shell History</h3>
                <span className="text-xs text-gray-500">PowerShell</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 font-mono text-xs text-gray-300">
                {history && history.length > 0 ? (
                    history.slice().reverse().map((cmd: string, i: number) => (
                        <div key={i} className="flex gap-2 border-b border-gray-800/30 pb-1 hover:bg-gray-800/50 px-1 rounded cursor-pointer group">
                            <span className="text-gray-600 select-none w-6 text-right shrink-0">{(history.length - i)}</span>
                            <span className="break-all group-hover:text-white transition-colors">{cmd}</span>
                        </div>
                    ))
                ) : (
                    <div className="text-gray-600 italic text-center">No history found or access denied.</div>
                )}
            </div>
        </div>
    );
}
