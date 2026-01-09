import React, { useState } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import { useAgents } from '../hooks/useApi.js';

export const AgentsView: React.FC = () => {
    const { agents, loading } = useAgents();
    const [selected, setSelected] = useState<string | null>(null);

    if (loading) {
        return (
            <Box>
                <Text color="cyan"><Spinner type="dots" /></Text>
                <Text> Loading agents...</Text>
            </Box>
        );
    }

    if (agents.length === 0) {
        return (
            <Box flexDirection="column">
                <Text color="yellow">No agents found.</Text>
                <Text dimColor>Make sure agents are configured in the agents/ directory.</Text>
            </Box>
        );
    }

    const items = agents.map(agent => ({
        label: agent.name,
        value: agent.name,
        description: agent.description
    }));

    const selectedAgent = selected ? agents.find(a => a.name === selected) : null;

    return (
        <Box flexDirection="row" gap={2}>
            <Box flexDirection="column" width={30} borderStyle="single" borderColor="gray" paddingX={1}>
                <Text bold color="cyan">Agents ({agents.length})</Text>
                <Box marginTop={1}>
                    <SelectInput
                        items={items}
                        onSelect={(item) => setSelected(item.value)}
                        onHighlight={(item) => setSelected(item.value)}
                    />
                </Box>
            </Box>

            <Box flexDirection="column" flexGrow={1} borderStyle="single" borderColor="gray" paddingX={1}>
                <Text bold color="cyan">Details</Text>
                {selectedAgent ? (
                    <Box marginTop={1} flexDirection="column">
                        <Box>
                            <Text bold>Name: </Text>
                            <Text color="yellow">{selectedAgent.name}</Text>
                        </Box>
                        <Box marginTop={1}>
                            <Text bold>Description:</Text>
                        </Box>
                        <Text wrap="wrap">{selectedAgent.description || 'No description available'}</Text>
                    </Box>
                ) : (
                    <Text dimColor>Select an agent to view details</Text>
                )}
            </Box>
        </Box>
    );
};
