"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
// We'll use a simple fetch since tRPC setup for filesystem might be complex to pipe through right now
// But actually, we can just use a Server Component if this was App Router root, but 'use client' is here.
// Let's make a simple API route handler first or just fetch via existing tools?
// Wait, we have 'trpc.director.read_file' exposed? No.
// Let's use a server action or simple API route.
// Actually, for speed, I'll assume we can create an API route /api/docs

export default function DocsPage() {
    const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
    const [content, setContent] = useState<string>("");
    const [docs, setDocs] = useState<string[]>([]);

    useEffect(() => {
        // Mock list for now or fetch from an API we are about to create
        fetch('/api/docs').then(res => res.json()).then(data => setDocs(data.files));
    }, []);

    const loadDoc = async (filename: string) => {
        setSelectedDoc(filename);
        const res = await fetch(`/api/docs?file=${filename}`);
        const data = await res.json();
        setContent(data.content);
    };

    return (
        <div className="flex h-[calc(100vh-100px)] gap-6">
            {/* Sidebar */}
            <div className="w-64 bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
                <div className="p-4 border-b border-zinc-800">
                    <Link href="/dashboard" className="text-zinc-400 hover:text-white text-sm mb-4 block">← Back</Link>
                    <h2 className="font-bold text-white">Documentation</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {docs.map(doc => (
                        <button
                            key={doc}
                            onClick={() => loadDoc(doc)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate transition-colors ${selectedDoc === doc ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
                        >
                            {doc}
                        </button>
                    ))}
                </div>
            </div>

            {/* Viewer */}
            <div className="flex-1 bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-y-auto p-8 relative">
                {selectedDoc ? (
                    <div className="prose prose-invert max-w-none">
                        <h1 className="text-2xl font-bold mb-4 text-blue-400 border-b border-zinc-800 pb-2">{selectedDoc}</h1>
                        <pre className="whitespace-pre-wrap font-mono text-sm text-zinc-300 bg-black/40 p-4 rounded-lg border border-zinc-800/50">
                            {content}
                        </pre>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-zinc-600 italic">
                        Select a document to read
                    </div>
                )}
            </div>
        </div>
    );
}
