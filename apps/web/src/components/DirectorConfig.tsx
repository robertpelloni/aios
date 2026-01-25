'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/utils/trpc';

export default function DirectorConfig() {
    const configQuery = trpc.directorConfig.get.useQuery(undefined, {
        refetchInterval: 5000 // Refresh every 5s to see changes
    });

    const updateMutation = trpc.directorConfig.update.useMutation({
        onSuccess: () => configQuery.refetch()
    });

    const [formState, setFormState] = useState<any>({});
    const [isEditing, setIsEditing] = useState(false);

    // Sync form with data when loaded (only if not editing)
    useEffect(() => {
        if (configQuery.data && !isEditing) {
            setFormState(configQuery.data);
        }
    }, [configQuery.data, isEditing]);

    const handleChange = (field: string, value: any) => {
        setIsEditing(true);
        setFormState((prev: any) => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        updateMutation.mutate(formState);
        setIsEditing(false);
    };

    if (configQuery.isLoading) return <div className="p-4 bg-gray-900/50 rounded animate-pulse">Loading config...</div>;

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-4">
            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                Director Configuration
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Loop Timing */}
                <div className="space-y-4">
                    <h3 className="text-gray-400 font-medium border-b border-gray-800 pb-2">Loop Timing</h3>

                    <ConfigSlider
                        label="Task Cooldown"
                        value={formState.taskCooldownMs}
                        onChange={(v) => handleChange('taskCooldownMs', v)}
                        min={1000} max={60000} step={1000}
                        unit="ms"
                    />

                    <ConfigSlider
                        label="Heartbeat Interval"
                        value={formState.heartbeatIntervalMs}
                        onChange={(v) => handleChange('heartbeatIntervalMs', v)}
                        min={1000} max={60000} step={1000}
                        unit="ms"
                    />
                </div>

                {/* Features */}
                <div className="space-y-4">
                    <h3 className="text-gray-400 font-medium border-b border-gray-800 pb-2">Behavior</h3>

                    <ConfigSlider
                        label="Periodic Summary"
                        value={formState.periodicSummaryMs}
                        onChange={(v) => handleChange('periodicSummaryMs', v)}
                        min={60000} max={600000} step={30000}
                        unit="ms"
                    />

                    <ConfigSlider
                        label="Paste Output Delay"
                        value={formState.pasteToSubmitDelayMs}
                        onChange={(v) => handleChange('pasteToSubmitDelayMs', v)}
                        min={0} max={5000} step={100}
                        unit="ms"
                    />

                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-300">Detection Mode</span>
                        <select
                            className="bg-gray-800 border-none rounded px-2 py-1 text-sm text-white focus:ring-1 focus:ring-blue-500"
                            value={formState.acceptDetectionMode}
                            onChange={(e) => handleChange('acceptDetectionMode', e.target.value)}
                        >
                            <option value="polling">Polling (Interval)</option>
                            <option value="state">State-Based (Event)</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-800">
                <button
                    onClick={handleSave}
                    disabled={!isEditing || updateMutation.isLoading}
                    className={`px-4 py-2 rounded font-medium transition-colors ${isEditing
                            ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20'
                            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                        }`}
                >
                    {updateMutation.isLoading ? 'Saving...' : 'Apply Changes'}
                </button>
            </div>
        </div>
    );
}

function ConfigSlider({ label, value, onChange, min, max, step, unit }: any) {
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-sm">
                <span className="text-gray-300">{label}</span>
                <span className="text-blue-400 font-mono">{value} {unit}</span>
            </div>
            <input
                type="range"
                min={min} max={max} step={step}
                value={value || 0}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
        </div>
    );
}
