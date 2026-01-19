
"use client";
import { trpc } from "../utils/trpc";

export default function ConnectionStatus() {
    const hello = trpc.health.useQuery();

    if (!hello.data) return <div>Loading Core Status...</div>;
    return (
        <div className="p-4 border rounded bg-slate-900 text-white">
            <h2 className="text-xl font-bold">Orchestrator Status</h2>
            <p>Service: {hello.data.service}</p>
            <p>State: <span className="text-green-400">{hello.data.status}</span></p>
        </div>
    );
}
