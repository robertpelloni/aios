"use client";

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ToolEvent {
    id: string;
    timestamp: number;
    tool: string;
    args: any;
    status: 'pending' | 'success' | 'error';
    duration?: number;
    result?: string;
}

export function TrafficInspector() {
    const [events, setEvents] = useState<ToolEvent[]>([]);
    const [isLive, setIsLive] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Connect to same WebSocket port as the Extension
        const ws = new WebSocket('ws://localhost:3001');

        ws.onopen = () => {
            console.log('Traffic Inspector Connected');
        };

        ws.onmessage = (msg) => {
            if (!isLive) return;
            try {
                const data = JSON.parse(msg.data);
                if (data.type === 'TOOL_CALL_START') {
                    setEvents(prev => [...prev, {
                        id: data.id,
                        timestamp: Date.now(),
                        tool: data.tool,
                        args: data.args,
                        status: 'pending' as const
                    }].slice(-50)); // Keep last 50
                }
                if (data.type === 'TOOL_CALL_END') {
                    setEvents(prev => prev.map(e =>
                        e.id === data.id
                            ? { ...e, status: (data.success ? 'success' : 'error') as 'success' | 'error', duration: data.duration, result: data.result }
                            : e
                    ));
                }
            } catch (e) { }
        };

        return () => ws.close();
    }, [isLive]);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [events]);

    return (
        <div className="p-6 bg-[#1e1e1e] rounded-xl border border-[#333] shadow-lg flex flex-col h-[500px]">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-xl font-bold text-white mb-1">Live Traffic Inspector</h2>
                    <p className="text-gray-400 text-sm">Real-time tool execution stream</p>
                </div>
                <button
                    onClick={() => setIsLive(!isLive)}
                    className={`px-3 py-1 text-sm rounded transition-colors ${isLive
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}
                >
                    {isLive ? '● Live' : '○ Paused'}
                </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 pr-2">
                <AnimatePresence>
                    {events.length === 0 && (
                        <div className="text-gray-500 text-center py-10">Waiting for tool activity...</div>
                    )}
                    {events.map(event => (
                        <motion.div
                            key={event.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`p-3 rounded border text-sm font-mono ${event.status === 'pending' ? 'bg-blue-500/5 border-blue-500/20' :
                                event.status === 'error' ? 'bg-red-500/5 border-red-500/20' :
                                    'bg-zinc-800/50 border-zinc-700/50'
                                }`}
                        >
                            <div className="flex justify-between items-start">
                                <span className={`font-bold ${event.status === 'pending' ? 'text-blue-400' :
                                    event.status === 'error' ? 'text-red-400' : 'text-purple-400'
                                    }`}>
                                    {event.tool}
                                </span>
                                <span className="text-xs text-gray-500">
                                    {event.duration ? `${event.duration}ms` : 'Running...'}
                                </span>
                            </div>
                            <div className="text-gray-400 mt-1 truncate">
                                args: {JSON.stringify(event.args)}
                            </div>
                            {event.result && (
                                <div className="mt-2 pt-2 border-t border-white/5 text-gray-500 text-xs truncate">
                                    → {event.result.substring(0, 100)}...
                                </div>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}
