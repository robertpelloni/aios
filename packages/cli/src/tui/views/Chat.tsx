import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { useStore } from '../hooks/useStore.js';
import { runAgent } from '../hooks/useApi.js';

export const ChatView: React.FC = () => {
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const { chatHistory, addMessage, clearChat } = useStore();

    useInput((_, key) => {
        if (key.ctrl && key.delete) {
            clearChat();
        }
    });

    const handleSubmit = async (value: string) => {
        if (!value.trim() || loading) return;
        
        const task = value.trim();
        setInput('');
        addMessage('user', task);
        setLoading(true);

        try {
            const result = await runAgent('default', task);
            if (result.success && result.output) {
                addMessage('assistant', result.output);
            } else {
                addMessage('assistant', `Error: ${result.error || 'Unknown error'}`);
            }
        } catch (err) {
            addMessage('assistant', `Error: ${err instanceof Error ? err.message : 'Request failed'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box flexDirection="column" height={20}>
            <Box 
                flexDirection="column" 
                borderStyle="single" 
                borderColor="gray" 
                paddingX={1} 
                flexGrow={1}
                overflowY="hidden"
            >
                {chatHistory.length === 0 ? (
                    <Text dimColor>No messages yet. Type a task and press Enter.</Text>
                ) : (
                    chatHistory.slice(-10).map((msg, i) => (
                        <Box key={i} marginBottom={1}>
                            <Text color={msg.role === 'user' ? 'cyan' : 'green'}>
                                {msg.role === 'user' ? '> ' : '← '}
                            </Text>
                            <Text wrap="wrap">{msg.content.slice(0, 200)}</Text>
                        </Box>
                    ))
                )}
                {loading && (
                    <Box>
                        <Text color="yellow"><Spinner type="dots" /></Text>
                        <Text> Processing...</Text>
                    </Box>
                )}
            </Box>

            <Box marginTop={1}>
                <Text color="cyan">{'> '}</Text>
                <TextInput
                    value={input}
                    onChange={setInput}
                    onSubmit={handleSubmit}
                    placeholder="Enter a task for the agent..."
                />
            </Box>

            <Box marginTop={1}>
                <Text dimColor>Press Ctrl+Delete to clear chat</Text>
            </Box>
        </Box>
    );
};
