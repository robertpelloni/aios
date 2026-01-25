
import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

export const App = ({ view }: { view: string }) => {
    const [status, setStatus] = useState<any>(null);
    const [health, setHealth] = useState<any>(null);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        const poll = async () => {
            try {
                // Fetch Health
                // @ts-ignore
                const hRes = await fetch('http://localhost:3000/trpc/health');
                const hData = await hRes.json();
                setHealth(hData.result?.data);

                // Fetch Director Status
                // @ts-ignore
                const dRes = await fetch('http://localhost:3000/trpc/director.status');
                const dData = await dRes.json();
                setStatus(dData.result?.data);

                setError('');
            } catch (e: any) {
                setError(e.message);
                setHealth(null);
                setStatus(null);
            }
        };

        poll();
        const interval = setInterval(poll, 2000);
        return () => clearInterval(interval);
    }, []);

    if (view === 'status') {
        return (
            <Box borderStyle="round" borderColor={health?.status === 'running' ? "green" : "red"} flexDirection="column" padding={1} width={60}>
                <Box justifyContent="space-between" marginBottom={1}>
                    <Text bold color="white">Borg Orchestrator II</Text>
                    <Text color={health?.status === 'running' ? "green" : "red"}>
                        {health?.status === 'running' ? "● ONLINE" : "○ OFFLINE"}
                    </Text>
                </Box>

                {error && <Text color="red">Connection Error: {error}</Text>}

                {status && (
                    <Box flexDirection="column" marginTop={1}>
                        <Box>
                            <Text bold>Director: </Text>
                            <Text color={status.active ? "cyan" : "gray"}>
                                {status.active ? "ACTIVE (Auto-Drive)" : "IDLE"}
                            </Text>
                        </Box>
                        <Box>
                            <Text bold>Goal: </Text>
                            <Text>{status.goal || "No active goal"}</Text>
                        </Box>
                        <Box marginTop={1}>
                            <Text color="gray">To control, use Dashboard or Voice commands.</Text>
                        </Box>
                    </Box>
                )}
            </Box>
        );
    }

    return <Text>Unknown view: {view}</Text>;
};
