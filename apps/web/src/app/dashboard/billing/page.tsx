"use client";

import React from 'react';
import { trpc } from '@/utils/trpc';

export default function BillingPage() {
    const { data, isLoading } = trpc.billing.getStatus.useQuery();

    if (isLoading) return <div className="p-6">Loading billing data...</div>;

    const { keys, usage } = data || { keys: {}, usage: { breakdown: [] } };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Billing & API Credentials</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* API Key Status */}
                <div className="p-6 border rounded-lg bg-zinc-900 border-zinc-700">
                    <h2 className="text-xl font-semibold mb-4 text-emerald-400">API Key Status</h2>
                    <ul className="space-y-3">
                        {Object.entries(keys).map(([provider, isActive]) => (
                            <li key={provider} className="flex justify-between items-center p-2 bg-zinc-800 rounded">
                                <span className="capitalize">{provider}</span>
                                <span className={`px-2 py-1 rounded text-xs font-bold ${isActive ? 'bg-emerald-900 text-emerald-400' : 'bg-red-900 text-red-400'}`}>
                                    {isActive ? 'ACTIVE' : 'MISSING'}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Cost Estimation */}
                <div className="p-6 border rounded-lg bg-zinc-900 border-zinc-700">
                    <h2 className="text-xl font-semibold mb-4 text-amber-400">Current Sprint Usage (Est.)</h2>
                    <div className="text-4xl font-mono mb-2">${usage?.currentMonth?.toFixed(2)}</div>
                    <p className="text-zinc-500 text-sm mb-4">Limit: ${usage?.limit?.toFixed(2)}</p>

                    <table className="w-full text-sm text-left">
                        <thead className="text-zinc-500 border-b border-zinc-700">
                            <tr>
                                <th className="py-2">Provider</th>
                                <th className="py-2">Requests</th>
                                <th className="py-2 text-right">Cost</th>
                            </tr>
                        </thead>
                        <tbody className="text-zinc-300 divide-y divide-zinc-800">
                            {usage?.breakdown?.map((b: any) => (
                                <tr key={b.provider}>
                                    <td className="py-2">{b.provider}</td>
                                    <td className="py-2">{b.requests}</td>
                                    <td className="py-2 text-right">${b.cost.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
