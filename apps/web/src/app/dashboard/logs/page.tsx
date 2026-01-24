"use client";

import Link from "next/link";
import { LogViewer } from "@/components/LogViewer";

export default function LogsPage() {
    return (
        <div className="flex flex-col h-[calc(100vh-100px)] space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Link href="/dashboard" className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors">
                        ← Back
                    </Link>
                    <h1 className="text-2xl font-bold text-white">System Logs</h1>
                </div>
                <div className="text-zinc-500 text-sm">
                    Connecting to ws://localhost:3001
                </div>
            </div>

            {/* Viewer */}
            <div className="flex-1 w-full relative">
                <div className="absolute inset-0">
                    <LogViewer />
                </div>
            </div>
        </div>
    );
}
