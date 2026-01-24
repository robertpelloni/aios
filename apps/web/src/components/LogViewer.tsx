"use client";

import { useEffect, useState, useRef } from "react";

interface LogEntry {
    source: string;
    message: string;
    timestamp: number;
    type?: string;
}

export function LogViewer() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Direct WebSocket connection to Borg Core
        // Note: In production we might proxy this, but for local dev this is fine
        const ws = new WebSocket('ws://localhost:3001');

        ws.onopen = () => {
            setIsConnected(true);
            setLogs(prev => [...prev, { source: 'System', message: 'Connected to Live Stream', timestamp: Date.now(), type: 'system' }]);
        };

        ws.onclose = () => {
            setIsConnected(false);
            setLogs(prev => [...prev, { source: 'System', message: 'Stream Disconnected', timestamp: Date.now(), type: 'error' }]);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'LOG_ENTRY') {
                    setLogs(prev => [...prev, {
                        source: data.source,
                        message: data.message,
                        timestamp: data.timestamp || Date.now(),
                        type: 'info'
                    }].slice(-500)); // Keep last 500 logs
                }
                else if (data.type === 'TOOL_CALL_START') {
                    setLogs(prev => [...prev, {
                        source: 'Tool',
                        message: `▶ Executing ${data.tool}(${JSON.stringify(data.args)})`,
                        timestamp: Date.now(),
                        type: 'tool-start'
                    }].slice(-500));
                }
                else if (data.type === 'TOOL_CALL_END') {
                    setLogs(prev => [...prev, {
                        source: 'Tool',
                        message: `${data.success ? '✅' : '❌'} ${data.tool} finished (${data.duration}ms): ${data.result}`,
                        timestamp: Date.now(),
                        type: data.success ? 'tool-success' : 'tool-error'
                    }].slice(-500));
                }

            } catch (e) {
                // Ignore parsing errors
            }
        };

        return () => {
            ws.close();
        };
    }, []);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div className="flex flex-col h-full bg-black/80 rounded-lg border border-zinc-800 overflow-hidden font-mono text-xs md:text-sm shadow-inner">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
                <div className="flex items-center space-x-2">
                    <span className="text-green-500 text-lg">›</span>
                    <span className="font-bold text-zinc-300">Live Agent Stream</span>
                </div>
                <div className="flex items-center space-x-2">
                    <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                    <span className="text-zinc-500 uppercase text-[10px]">{isConnected ? 'Live' : 'Offline'}</span>
                </div>
            </div>

            {/* Logs Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                {logs.length === 0 && (
                    <div className="text-zinc-600 italic text-center mt-10">Waiting for agent activity...</div>
                )}
                {logs.map((log, i) => (
                    <div key={i} className={`flex space-x-3 hover:bg-white/5 p-0.5 rounded ${getLogColor(log.type)}`}>
                        <span className="text-zinc-600 w-16 shrink-0 text-[10px] pt-0.5">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <span className="w-16 shrink-0 font-bold opacity-70 text-right pr-2 border-r border-zinc-800/50">
                            {log.source}
                        </span>
                        <span className="flex-1 break-words whitespace-pre-wrap">
                            {log.message}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function getLogColor(type?: string) {
    switch (type) {
        case 'error': return 'text-red-400';
        case 'tool-error': return 'text-red-400';
        case 'tool-start': return 'text-yellow-300';
        case 'tool-success': return 'text-green-400';
        case 'system': return 'text-blue-400';
        default: return 'text-zinc-300';
    }
}
