"use client";

import React from 'react';

export function CommandCheatsheet() {
    const commands = [
        { cmd: '/help', desc: 'List commands' },
        { cmd: '/git status', desc: 'Repo status' },
        { cmd: '/context add [file]', desc: 'Pin file' },
        { cmd: '/director status', desc: 'Agent Info' },
    ];

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-mono font-semibold text-gray-400 mb-2">⌨️ Slash Commands</h3>
            <div className="grid grid-cols-2 gap-2">
                {commands.map((c) => (
                    <div key={c.cmd} className="flex flex-col">
                        <code className="text-xs text-green-400 font-mono bg-gray-800/50 px-1 py-0.5 rounded w-fit">{c.cmd}</code>
                        <span className="text-[10px] text-gray-500">{c.desc}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
