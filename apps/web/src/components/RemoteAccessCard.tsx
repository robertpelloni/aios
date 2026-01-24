"use client";
import { trpc } from "../utils/trpc";
import { useState } from "react";

export default function RemoteAccessCard() {
    const statusQuery = trpc.remoteAccess.status.useQuery(undefined, {
        refetchInterval: 5000
    });

    // @ts-ignore - tRPC types might lag behind build
    const startMutation = trpc.remoteAccess.start.useMutation();
    // @ts-ignore
    const stopMutation = trpc.remoteAccess.stop.useMutation();

    const [error, setError] = useState<string | null>(null);

    const handleToggle = async () => {
        setError(null);
        try {
            if (statusQuery.data?.active) {
                await stopMutation.mutateAsync();
            } else {
                await startMutation.mutateAsync();
            }
            statusQuery.refetch();
        } catch (e: any) {
            setError(e.message);
        }
    };

    const isLoading = statusQuery.isLoading || startMutation.isPending || stopMutation.isPending;
    const isActive = statusQuery.data?.active;

    return (
        <div className="p-6 border rounded-lg bg-zinc-900 text-zinc-100 shadow-md w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">📡 Remote Access</h2>
                <div className={`px-2 py-1 rounded text-xs font-bold ${isActive ? 'bg-green-600' : 'bg-zinc-700'}`}>
                    {isActive ? 'ONLINE' : 'OFFLINE'}
                </div>
            </div>

            <p className="text-sm text-zinc-400 mb-4">
                Expose your Borg Dashboard securely via Cloudflare Tunnel to access it from your mobile device.
            </p>

            {isActive && statusQuery.data?.url && (
                <div className="mb-4 p-3 bg-zinc-800 rounded border border-zinc-700 break-all">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Public URL</p>
                    <a href={statusQuery.data.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                        {statusQuery.data.url}
                    </a>
                </div>
            )}

            {error && (
                <div className="mb-4 p-2 bg-red-900/50 text-red-200 text-sm rounded">
                    {error}
                </div>
            )}

            <button
                onClick={handleToggle}
                disabled={isLoading}
                className={`w-full py-2 px-4 rounded font-medium transition-colors ${isActive
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                {isLoading ? 'Processing...' : (isActive ? 'Disable Remote Access' : 'Enable Remote Access')}
            </button>
        </div>
    );
}
