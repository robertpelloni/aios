"use client";

import React, { useEffect, useRef, useState } from 'react';
import { trpc } from '../utils/trpc';

export function GraphWidget() {
    // @ts-ignore
    const { data: graphData } = (trpc as any).graph.getGraph.useQuery(undefined, { refetchOnWindowFocus: false });
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!graphData || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { nodes, links } = graphData;
        let width = canvas.width;
        let height = canvas.height;

        // Simple Force Layout Simulation
        const simulationNodes = nodes.map((n: any) => ({ ...n, x: Math.random() * width, y: Math.random() * height, vx: 0, vy: 0 }));
        const simulationLinks = links.map((l: any) => ({
            source: simulationNodes.find((n: any) => n.id === l.source),
            target: simulationNodes.find((n: any) => n.id === l.target)
        })).filter((l: any) => l.source && l.target);

        let animationFrameId: number;

        const tick = () => {
            ctx.fillStyle = '#111827'; // gray-900
            ctx.fillRect(0, 0, width, height);

            // Forces
            simulationNodes.forEach((node: any) => {
                // Center Gravity
                node.vx += (width / 2 - node.x) * 0.005;
                node.vy += (height / 2 - node.y) * 0.005;

                // Repulsion
                simulationNodes.forEach((other: any) => {
                    if (node !== other) {
                        const dx = node.x - other.x;
                        const dy = node.y - other.y;
                        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                        const force = 500 / (dist * dist);
                        node.vx += (dx / dist) * force;
                        node.vy += (dy / dist) * force;
                    }
                });

                // Velocity Damping
                node.vx *= 0.9;
                node.vy *= 0.9;

                node.x += node.vx;
                node.y += node.vy;
            });

            // Link constraints
            simulationLinks.forEach((link: any) => {
                const dx = link.target.x - link.source.x;
                const dy = link.target.y - link.source.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const targetDist = 50;
                const force = (dist - targetDist) * 0.05;
                const fx = (dx / dist) * force;
                const fy = (dy / dist) * force;

                link.source.vx += fx;
                link.source.vy += fy;
                link.target.vx -= fx;
                link.target.vy -= fy;
            });

            // Draw Links
            ctx.strokeStyle = '#374151'; // gray-700
            ctx.beginPath();
            simulationLinks.forEach((link: any) => {
                ctx.moveTo(link.source.x, link.source.y);
                ctx.lineTo(link.target.x, link.target.y);
            });
            ctx.stroke();

            // Draw Nodes
            simulationNodes.forEach((node: any) => {
                ctx.fillStyle = '#60A5FA'; // blue-400
                ctx.beginPath();
                ctx.arc(node.x, node.y, 3, 0, Math.PI * 2);
                ctx.fill();
            });

            animationFrameId = requestAnimationFrame(tick);
        };

        tick();

        return () => cancelAnimationFrame(animationFrameId);

    }, [graphData]);

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 h-full flex flex-col">
            <h3 className="text-lg font-mono font-semibold text-purple-400 mb-2">🕸️ Dependencies</h3>
            <div className="flex-1 min-h-[200px] relative bg-black/50 rounded overflow-hidden">
                {(!graphData || graphData.nodes.length === 0) && (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-xs">
                        No Graph Data
                    </div>
                )}
                <canvas
                    ref={canvasRef}
                    width={600}
                    height={300}
                    className="w-full h-full object-contain"
                />
            </div>
        </div>
    );
}
