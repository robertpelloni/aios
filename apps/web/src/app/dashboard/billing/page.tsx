
import React from 'react';

export default function BillingPage() {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Billing & API Keys</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded bg-zinc-800">
                    <h2 className="text-xl font-semibold">API Usage</h2>
                    <ul className="mt-2 space-y-2">
                        <li>Gemini: $0.00 / $10.00</li>
                        <li>OpenAI: $0.00 / $20.00</li>
                        <li>Anthropic: $0.00 / $5.00</li>
                    </ul>
                </div>
                <div className="p-4 border rounded bg-zinc-800">
                    <h2 className="text-xl font-semibold">Subscription Status</h2>
                    <p>Pro Plan: Active</p>
                    <p>Renewal: 2026-02-24</p>
                </div>
            </div>
        </div>
    );
}
