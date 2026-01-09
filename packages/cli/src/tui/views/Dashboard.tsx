import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { useSystemState } from '../hooks/useApi.js';

export const DashboardView: React.FC = () => {
    const { state, loading, error } = useSystemState();

    if (loading) {
        return (
            <Box>
                <Text color="cyan"><Spinner type="dots" /></Text>
                <Text> Loading system state...</Text>
            </Box>
        );
    }

    if (error) {
        return (
            <Box flexDirection="column">
                <Text color="red">✗ Error: {error}</Text>
                <Text dimColor>Make sure AIOS core is running on port 3000</Text>
            </Box>
        );
    }

    return (
        <Box flexDirection="column" gap={1}>
            <Box borderStyle="round" borderColor="cyan" paddingX={2} paddingY={1} flexDirection="column">
                <Text bold color="cyan">System Status</Text>
                <Box marginTop={1} flexDirection="column" gap={0}>
                    <Box>
                        <Text>Agents:      </Text>
                        <Text color="green" bold>{state?.agents?.length || 0}</Text>
                    </Box>
                    <Box>
                        <Text>Skills:      </Text>
                        <Text color="green" bold>{state?.skills?.length || 0}</Text>
                    </Box>
                    <Box>
                        <Text>MCP Servers: </Text>
                        <Text color="green" bold>{state?.mcpServers?.length || 0}</Text>
                    </Box>
                    <Box>
                        <Text>Memory:      </Text>
                        <Text color={state?.memory?.enabled ? 'green' : 'yellow'}>
                            {state?.memory?.enabled ? `✓ ${state.memory.provider}` : '○ Disabled'}
                        </Text>
                    </Box>
                </Box>
            </Box>

            {state?.agents && state.agents.length > 0 && (
                <Box borderStyle="single" borderColor="gray" paddingX={2} paddingY={1} flexDirection="column">
                    <Text bold>Available Agents</Text>
                    <Box marginTop={1} flexDirection="column">
                        {state.agents.slice(0, 5).map((agent, i) => (
                            <Box key={i}>
                                <Text color="yellow">• {agent.name}</Text>
                                <Text dimColor> - {agent.description?.slice(0, 50) || 'No description'}</Text>
                            </Box>
                        ))}
                        {state.agents.length > 5 && (
                            <Text dimColor>  ...and {state.agents.length - 5} more</Text>
                        )}
                    </Box>
                </Box>
            )}
        </Box>
    );
};
