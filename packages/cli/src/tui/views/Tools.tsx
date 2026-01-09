import React, { useState } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import { useTools } from '../hooks/useApi.js';

export const ToolsView: React.FC = () => {
    const { tools, loading } = useTools();
    const [selected, setSelected] = useState<string | null>(null);

    if (loading) {
        return (
            <Box>
                <Text color="cyan"><Spinner type="dots" /></Text>
                <Text> Loading tools...</Text>
            </Box>
        );
    }

    if (tools.length === 0) {
        return (
            <Box flexDirection="column">
                <Text color="yellow">No tools found.</Text>
                <Text dimColor>Connect MCP servers to load tools.</Text>
            </Box>
        );
    }

    const items = tools.slice(0, 50).map(tool => ({
        label: tool.name,
        value: tool.name
    }));

    const selectedTool = selected ? tools.find(t => t.name === selected) : null;

    return (
        <Box flexDirection="row" gap={2}>
            <Box flexDirection="column" width={35} borderStyle="single" borderColor="gray" paddingX={1}>
                <Text bold color="cyan">Tools ({tools.length})</Text>
                {tools.length > 50 && <Text dimColor>Showing first 50</Text>}
                <Box marginTop={1}>
                    <SelectInput
                        items={items}
                        onSelect={(item) => setSelected(item.value)}
                        onHighlight={(item) => setSelected(item.value)}
                        limit={15}
                    />
                </Box>
            </Box>

            <Box flexDirection="column" flexGrow={1} borderStyle="single" borderColor="gray" paddingX={1}>
                <Text bold color="cyan">Details</Text>
                {selectedTool ? (
                    <Box marginTop={1} flexDirection="column">
                        <Box>
                            <Text bold>Name: </Text>
                            <Text color="yellow">{selectedTool.name}</Text>
                        </Box>
                        {selectedTool.server && (
                            <Box>
                                <Text bold>Server: </Text>
                                <Text color="gray">{selectedTool.server}</Text>
                            </Box>
                        )}
                        <Box marginTop={1}>
                            <Text bold>Description:</Text>
                        </Box>
                        <Text wrap="wrap">{selectedTool.description || 'No description available'}</Text>
                    </Box>
                ) : (
                    <Text dimColor>Select a tool to view details</Text>
                )}
            </Box>
        </Box>
    );
};
