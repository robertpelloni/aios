"use client";

import { trpc } from "@/utils/trpc";
import DirectorConfig from '@/components/DirectorConfig';
import SystemStatus from '@/components/SystemStatus';
import CouncilConfig from '@/components/CouncilConfig';
import CouncilVisualizer from '@/components/CouncilVisualizer';
import CommandCenter from '@/components/CommandCenter';
import { Brain, Radio, Activity, Box } from 'lucide-react';
import { motion } from 'framer-motion';
import SuggestionsPanel from '@/components/SuggestionsPanel';
import Link from 'next/link';
import {
    SystemDashboard,
    RoadmapWidget,
    SessionsDashboard,
    DirectorStatusWidget
} from '@borg/ui';

export default function DashboardHome() {
    const { data: health } = trpc.health.useQuery();
    const { data: status } = trpc.director.status.useQuery(undefined, { refetchInterval: 2000 });
    const { data: systemInfo } = trpc.system.info.useQuery(undefined, { refetchInterval: 10000 });
    const { data: roadmapContent } = trpc.roadmap.get.useQuery();

    // Mutation placeholder for buttons (assuming they exist on director router or generic execute)
    const startMutation = trpc.director.executeTool.useMutation();
    const stopMutation = trpc.director.executeTool.useMutation();
    const isDriving = status?.active || false;

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
                    <div className="h-full min-h-[400px]">
                        <DirectorStatusWidget />
                    </div>
                    <div className="space-y-6">
                        <RoadmapWidget content={roadmapContent || "# Loading..."} />
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
        <div className="min-h-screen bg-zinc-950 p-8 text-white space-y-12 pb-32">
            <header className="flex items-center gap-4 border-b border-white/5 pb-6">
                <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                    <Box className="w-8 h-8 text-indigo-400" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Mission Control</h1>
                    <p className="text-zinc-500">System Overview & Management</p>
                </div>
            </header>

            <div className="flex flex-col gap-16">
                {sections.map((section, idx) => (
                    <motion.section
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="space-y-6"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <span className={`p-2 rounded-lg bg-zinc-900 border border-zinc-800 ${section.color}`}>
                                <section.icon className="w-5 h-5" />
                            </span>
                            <h2 className="text-xl font-semibold text-zinc-200">{section.title}</h2>
                        </div>

                        {section.content}
                    </motion.section>
                ))}
            </div>
        </div>
    );
}

function ShortcutCard({ title, desc, href, icon, color }: any) {
    return (
        <Link href={href} className="group p-5 bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/60 rounded-xl transition-all">
            <div className="flex items-start justify-between mb-3">
                <span className={`text-2xl ${color}`}>{icon === 'terminal' ? <span className="font-mono text-lg">_&gt;</span> : icon}</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500">↗</span>
            </div>
            <h3 className="font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">{title}</h3>
            <p className="text-sm text-zinc-500">{desc}</p>
        </Link>
    );
}
