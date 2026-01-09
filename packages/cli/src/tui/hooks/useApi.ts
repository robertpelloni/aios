import { useState, useEffect, useCallback } from 'react';

const API_BASE = process.env.AIOS_API || 'http://localhost:3000';

export interface SystemState {
    agents: Array<{ name: string; description: string }>;
    skills: Array<{ name: string; description: string }>;
    mcpServers: Array<{ name: string; status: string }>;
    memory: { enabled: boolean; provider: string };
}

export interface AgentResult {
    success: boolean;
    output?: string;
    error?: string;
}

export function useSystemState() {
    const [state, setState] = useState<SystemState | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/api/state`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setState(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch state');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { state, loading, error, refresh };
}

export function useAgents() {
    const [agents, setAgents] = useState<Array<{ name: string; description: string }>>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_BASE}/api/agents`)
            .then(r => r.json())
            .then(data => setAgents(data.agents || []))
            .catch(() => setAgents([]))
            .finally(() => setLoading(false));
    }, []);

    return { agents, loading };
}

export function useTools() {
    const [tools, setTools] = useState<Array<{ name: string; description: string; server?: string }>>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_BASE}/api/tools`)
            .then(r => r.json())
            .then(data => setTools(data.tools || []))
            .catch(() => setTools([]))
            .finally(() => setLoading(false));
    }, []);

    return { tools, loading };
}

export async function runAgent(agentName: string, task: string): Promise<AgentResult> {
    const res = await fetch(`${API_BASE}/api/agents/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentName, task })
    });
    return res.json();
}

export async function callTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    const res = await fetch(`${API_BASE}/api/tools/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: toolName, arguments: args })
    });
    return res.json();
}
