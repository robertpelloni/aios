'use client';
import { trpc } from '@/utils/trpc';

export default function SystemStatus() {
    const { data, isLoading } = trpc.system.stats.useQuery(undefined, { refetchInterval: 3000 });

    if (isLoading) return <div className="p-4 bg-gray-900/50 rounded animate-pulse">Loading status...</div>;
    if (!data || data.error) {
        return <div className="p-4 bg-red-900/20 text-red-400 rounded border border-red-900/50">
            System Unavailable
            <span className="block text-xs opacity-50">{data?.error}</span>
        </div>;
    }

    const { cpu_model, memory_usage_percent, memory_free_gb, uptime_hours, load_average } = data;

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-4">
            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-400">
                System Status
            </h2>
            <div className="grid grid-cols-2 gap-4">
                <Stat label="CPU Load (1m)" value={load_average?.[0]?.toFixed(2) || '0.00'} unit="" />
                <Stat label="Memory Usage" value={memory_usage_percent} unit="%" />
                <Stat label="Free RAM" value={memory_free_gb} unit="GB" />
                <Stat label="Uptime" value={uptime_hours} unit="h" />
            </div>
            <div className="text-xs text-gray-600 font-mono mt-2 truncate max-w-full" title={cpu_model}>
                {cpu_model}
            </div>
        </div>
    );
}

function Stat({ label, value, unit }: any) {
    return (
        <div className="bg-gray-800/40 p-3 rounded-lg border border-gray-800/50">
            <div className="text-gray-400 text-xs font-medium uppercase tracking-wider">{label}</div>
            <div className="text-emerald-300 font-mono text-xl font-bold mt-1">
                {value}<span className="text-xs text-gray-500 ml-1 font-normal">{unit}</span>
            </div>
        </div>
    )
}
