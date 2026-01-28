```typescript
"use client";

import { trpc } from "@/utils/trpc";
import { DirectorConfig } from '@/components/DirectorConfig';
import { SystemStatus } from '@/components/SystemStatus';
import { CouncilConfig } from '@/components/CouncilConfig';
import { CouncilVisualizer } from '@/components/CouncilVisualizer';
import CommandCenter from '@/components/CommandCenter';
import { Brain, Radio, Activity, Box } from 'lucide-react'; // Only import icons actually used
import { motion } from 'framer-motion';
import SuggestionsPanel from '@/components/SuggestionsPanel'; 
import {
    SystemDashboard,
    RoadmapWidget,
    SessionsDashboard
} from '@borg/ui';

export default function DashboardHome() {
    const { data: health } = trpc.health.useQuery();
    const { data: status } = trpc.director.status.useQuery(undefined, { refetchInterval: 2000 });
    const { data: systemInfo } = trpc.system.info.useQuery(undefined, { refetchInterval: 10000 });
    const { data: roadmapContent } = trpc.roadmap.get.useQuery();

    const sections = [
        {
            title: "Command & Control",
            icon: Radio,
            color: "text-blue-400",
            content: (
                <div className="space-y-6">
                    <CommandCenter />
                    <SuggestionsPanel />
                </div>
            )
        },
        {
            title: "Intelligence & Strategy",
            icon: Brain,
            color: "text-purple-400",
            content: (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <RoadmapWidget content={roadmapContent || "# Loading..."} />
                    <div className="space-y-6">
                         <DirectorConfig config={status?.config} />
                    </div>
                </div>
            )
        },
        {
            title: "Operations & Activity",
            icon: Activity,
            color: "text-green-400",
            content: (
                <div className="space-y-6">
                    <SessionsDashboard />
                    <SystemStatus health={health} status={status} />
                </div>
            )
        },
        {
            title: "System Ecosystem",
            icon: Box,
            color: "text-orange-400",
            content: (
                <div className="space-y-6">
                    <SystemDashboard info={systemInfo} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <CouncilConfig />
                         <CouncilVisualizer />
                    </div>
                </div>
            )
        }
    ];

    return (
        <div className="min-h-screen bg-black/90 p-8 text-white space-y-12 pb-32">
            <header className="flex items-center justify-between border-b border-white/10 pb-6">
                <div>
                <div className="flex items-center space-x-4 bg-black/40 p-2 rounded-xl border border-zinc-800/50">
                    <div className="px-4 text-right">
                        <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Director Status</div>
                        <div className={`text - lg font - bold ${ isDriving ? 'text-blue-400 animate-pulse' : 'text-zinc-400' } `}>
                            {status?.status || 'UNKNOWN'}
                        </div>
                    </div>

                    {isDriving ? (
                        <button
                            onClick={() => stopMutation.mutate()}
                            disabled={stopMutation.isPending}
                            className="h-12 px-6 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 rounded-lg font-bold transition-all flex items-center gap-2"
                        >
                            {stopMutation.isPending ? 'STOPPING...' : '⏹ STOP AUTO-DRIVE'}
                        </button>
                    ) : (
                        <button
                            onClick={() => startMutation.mutate()}
                            disabled={startMutation.isPending}
                            className="h-12 px-6 bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 rounded-lg font-bold transition-all flex items-center gap-2"
                        >
                            {startMutation.isPending ? 'STARTING...' : '▶ ENGAGE AUTO-DRIVE'}
                        </button>
                    )}
                </div>
            </div>

            {/* COMMAND CENTER (Voice/Text Input) */}
            <CommandCenter />

            {/* Main Intelligence Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Left Column: System & Config */}
                <div className="space-y-6">
                    <SystemStatus />
                    <DirectorConfig />
                    <CouncilConfig />
                </div>

                {/* Right Column: Live Council Visualizer (Spans 2 cols) */}
                <div className="xl:col-span-2">
                    <CouncilVisualizer />
                </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <ShortcutCard title="Skills Library" desc="Inspect available capabilities" href="/dashboard/skills" icon="⚡" color="text-yellow-400" />
                <ShortcutCard title="Architecture" desc="View dependency graph" href="/dashboard/architecture" icon="🏗️" color="text-purple-400" />
                <ShortcutCard title="Page Reader" desc="Scrape & convert web content" href="/dashboard/reader" icon="📖" color="text-orange-400" />
                <ShortcutCard title="Config Editor" desc="Manage system settings" href="/dashboard/config" icon="⚙️" color="text-zinc-400" />
                <ShortcutCard title="Traffic Inspector" desc="Real-time MCP packet capture" href="/dashboard/inspector" icon="📡" color="text-green-400" />
            </div>

            {/* Recent Activity / Context (Placeholder) */}
            <div className="p-6 bg-zinc-900/30 border border-zinc-800 rounded-xl">
                <h3 className="text-lg font-medium text-white mb-4">Current Objective</h3>
                <div className="bg-black/40 p-4 rounded-lg border border-zinc-800 font-mono text-sm text-zinc-300">
                    {status?.goal ? (
                        <span>{status.goal}</span>
                    ) : (
                        <span className="text-zinc-600 italic">No active goal context via search...</span>
                    )}
                </div>
            </div>
        </div>
    );
}

function ShortcutCard({ title, desc, href, icon, color }: any) {
    return (
        <Link href={href} className="group p-5 bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/60 rounded-xl transition-all">
            <div className="flex items-start justify-between mb-3">
                <span className={`text - 2xl ${ color } `}>{icon === 'terminal' ? <span className="font-mono text-lg">_&gt;</span> : icon}</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500">↗</span>
            </div>
            <h3 className="font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">{title}</h3>
            <p className="text-sm text-zinc-500">{desc}</p>
        </Link>
    );
}
