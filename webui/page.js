'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { MCPRouterStats } from './status-cards';
import * as MCPCommands from './mcp-commands';
export default function MCPRouterPage() {
    const [loading, setLoading] = useState(true);
    const [registryStats, setRegistryStats] = useState({ totalServers: 0, installedServers: 0, categories: 0 });
    const [sessionStats, setSessionStats] = useState({ totalSessions: 0, running: 0, stopped: 0, error: 0, totalClients: 0 });
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [activeTab, setActiveTab] = useState('registry');
    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true);
                const statsJson = await MCPCommands.getRegistryStats();
                const sessionStatsJson = await MCPCommands.getSessionStats();
                if (statsJson) {
                    const stats = JSON.parse(statsJson);
                    setRegistryStats({
                        totalServers: stats.totalServers || 0,
                        installedServers: stats.installedServers || 0,
                        categories: stats.categories || 0
                    });
                }
                if (sessionStatsJson) {
                    const stats = JSON.parse(sessionStatsJson);
                    setSessionStats({
                        totalSessions: stats.totalSessions || 0,
                        running: stats.running || 0,
                        stopped: stats.stopped || 0,
                        error: stats.error || 0,
                        totalClients: stats.totalClients || 0
                    });
                }
                setLoading(false);
            }
            catch (error) {
                console.error('Failed to load MCP Router data:', error);
                setLoading(false);
            }
        }
        loadData();
    }, []);
    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }
        try {
            setLoading(true);
            const resultsJson = await MCPCommands.searchServers(searchQuery, {
                format: 'json',
                category: selectedCategory || undefined
            });
            if (resultsJson) {
                const results = JSON.parse(resultsJson);
                setSearchResults(results);
            }
            setLoading(false);
        }
        catch (error) {
            console.error('Search failed:', error);
            setLoading(false);
        }
    };
    const handleDiscover = async () => {
        try {
            setLoading(true);
            const result = await MCPCommands.discoverServers();
            console.log('Discover result:', result);
            if (result) {
                const stats = JSON.parse(result);
                if (stats.totalServers !== undefined) {
                    setRegistryStats(prev => ({
                        ...prev,
                        totalServers: stats.totalServers
                    }));
                }
            }
            setLoading(false);
        }
        catch (error) {
            console.error('Discover failed:', error);
            setLoading(false);
        }
    };
    const handleInstall = async (serverName) => {
        try {
            setLoading(true);
            const result = await MCPCommands.installServer(serverName, { type: 'github', autoStart: true });
            console.log('Install result:', result);
            setLoading(false);
        }
        catch (error) {
            console.error('Install failed:', error);
            setLoading(false);
        }
    };
    const handleUninstall = async (serverId) => {
        try {
            setLoading(true);
            const result = await MCPCommands.uninstallServer(serverId);
            console.log('Uninstall result:', result);
            setLoading(false);
        }
        catch (error) {
            console.error('Uninstall failed:', error);
            setLoading(false);
        }
    };
    const handleCheckUpdates = async () => {
        try {
            setLoading(true);
            const result = await MCPCommands.checkUpdates();
            console.log('Updates result:', result);
            setLoading(false);
        }
        catch (error) {
            console.error('Check updates failed:', error);
            setLoading(false);
        }
    };
    const handleUpdate = async (serverId) => {
        try {
            setLoading(true);
            const result = await MCPCommands.updateServer(serverId);
            console.log('Update result:', result);
            setLoading(false);
        }
        catch (error) {
            console.error('Update failed:', error);
            setLoading(false);
        }
    };
    const handleHealthCheck = async (serverId) => {
        try {
            setLoading(true);
            const result = await MCPCommands.checkServerHealth(serverId);
            console.log('Health check result:', result);
            setLoading(false);
        }
        catch (error) {
            console.error('Health check failed:', error);
            setLoading(false);
        }
    };
    const handleDetectConfigs = async () => {
        try {
            setLoading(true);
            const result = await MCPCommands.detectConfigs({ recursive: false });
            console.log('Detect configs result:', result);
            setLoading(false);
        }
        catch (error) {
            console.error('Detect configs failed:', error);
            setLoading(false);
        }
    };
    const handleInitializeSessions = async () => {
        try {
            setLoading(true);
            const result = await MCPCommands.initializeSessions();
            console.log('Initialize sessions result:', result);
            setLoading(false);
        }
        catch (error) {
            console.error('Initialize sessions failed:', error);
            setLoading(false);
        }
    };
    const handleStartSession = async (serverId) => {
        try {
            setLoading(true);
            const result = await MCPCommands.startSession(serverId);
            console.log('Start session result:', result);
            setLoading(false);
        }
        catch (error) {
            console.error('Start session failed:', error);
            setLoading(false);
        }
    };
    const handleStopSession = async (serverId) => {
        try {
            setLoading(true);
            const result = await MCPCommands.stopSession(serverId);
            console.log('Stop session result:', result);
            setLoading(false);
        }
        catch (error) {
            console.error('Stop session failed:', error);
            setLoading(false);
        }
    };
    const handleRestartSession = async (serverId) => {
        try {
            setLoading(true);
            const result = await MCPCommands.restartSession(serverId);
            console.log('Restart session result:', result);
            setLoading(false);
        }
        catch (error) {
            console.error('Restart session failed:', error);
            setLoading(false);
        }
    };
    const handleShutdownSessions = async () => {
        try {
            setLoading(true);
            const result = await MCPCommands.shutdownSessions();
            console.log('Shutdown sessions result:', result);
            setLoading(false);
        }
        catch (error) {
            console.error('Shutdown sessions failed:', error);
            setLoading(false);
        }
    };
    const categories = ['file-system', 'database', 'development', 'api', 'ai-ml', 'utility', 'productivity'];
    return (_jsxs("div", { className: "min-h-screen bg-gradient-to-br from-gray-50 via-gray-900 text-gray-900", children: [_jsxs("div", { className: "container mx-auto px-4 py-8", children: [_jsx("h1", { className: "text-4xl font-bold text-white mb-2", children: "Ultimate MCP Router" }), _jsx("p", { className: "text-gray-400 text-lg mb-6", children: "Discover, install, and manage MCP servers from 100+ registries" }), _jsx(MCPRouterStats, { registryStats: registryStats, sessionStats: sessionStats }), _jsx("nav", { className: "mb-6 border-b border-gray-700", children: _jsx("div", { className: "flex space-x-1", children: ['registry', 'sessions', 'config'].map((tab) => (_jsxs("button", { onClick: () => setActiveTab(tab), className: `px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab
                                    ? 'text-blue-400 border-b-2 border-blue-400'
                                    : 'text-gray-400 border-b-2 border-transparent hover:text-gray-300'}`, children: [tab === 'registry' && 'Registry', tab === 'sessions' && 'Sessions', tab === 'config' && 'Configuration'] }))) }) }), activeTab === 'registry' && (_jsxs("div", { children: [_jsxs("div", { className: "flex gap-4 mb-6", children: [_jsx("input", { type: "text", placeholder: "Search MCP servers...", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), onKeyPress: (e) => e.key === 'Enter' && handleSearch(), className: "flex-1 bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" }), _jsx("button", { onClick: handleDiscover, disabled: loading, className: "bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50", children: loading ? 'Discovering...' : 'Discover All' })] }), _jsxs("div", { className: "flex gap-2 mb-6", children: [_jsx("button", { onClick: () => setSelectedCategory(null), className: "px-3 py-2 rounded-md text-sm font-medium bg-blue-600 text-white", children: "All" }), categories.map((cat) => (_jsx("button", { onClick: () => setSelectedCategory(selectedCategory === cat ? null : cat), className: `px-3 py-2 rounded-md text-sm font-medium bg-gray-700 text-gray-300 hover:bg-gray-600`, children: cat }, cat)))] }), searchResults.length > 0 && (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: searchResults.map((server) => (_jsxs("div", { className: "bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors", children: [_jsx("h3", { className: "text-lg font-semibold text-white", children: server.name }), _jsx("p", { className: "text-gray-400 text-sm mb-2", children: server.description }), _jsxs("div", { className: "flex items-center gap-2 mb-3", children: [_jsxs("span", { className: "text-gray-400", children: ["Category: ", server.category] }), server.rating && (_jsx("span", { className: "ml-2 text-yellow-400", children: server.rating })), _jsxs("span", { className: "text-gray-400", children: ["Source: ", server.source] })] }), _jsx("button", { onClick: () => server.installed ? handleUninstall(server.serverId) : handleInstall(server.name), disabled: loading, className: `px-3 py-2 rounded-md text-sm font-medium transition-colors ${server.installed
                                                ? 'bg-red-600 hover:bg-red-700'
                                                : 'bg-blue-600 hover:bg-blue-700'}`, children: loading ? 'Processing...' : server.installed ? 'Uninstall' : 'Install' }), server.installed && (_jsx("button", { onClick: () => handleHealthCheck(server.serverId), disabled: loading, className: "px-3 py-2 rounded-md text-sm font-medium bg-gray-700 text-gray-300 hover:bg-gray-600", children: "Health" }))] }))) })), ")}"] }))] }), ")}", activeTab === 'sessions' && (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex gap-4 mb-6", children: [_jsx("button", { onClick: handleInitializeSessions, disabled: loading, className: "flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50", children: loading ? 'Initializing...' : 'Initialize Sessions' }), _jsx("button", { onClick: handleShutdownSessions, disabled: loading, className: "flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50", children: loading ? 'Shutting down...' : 'Shutdown All Sessions' })] }), _jsxs("div", { className: "bg-gray-800 rounded-lg overflow-hidden", children: [_jsx("div", { className: "px-6 py-4 border-b border-gray-700", children: _jsxs("div", { className: "grid grid-cols-6 gap-4 text-sm text-gray-400", children: [_jsx("div", { children: "Name" }), _jsx("div", { children: "Status" }), _jsx("div", { children: "Clients" }), _jsx("div", { children: "Uptime" }), _jsx("div", { children: "Latency" }), _jsx("div", { children: "Actions" })] }) }), _jsxs("div", { className: "divide-y divide-gray-700", children: [sessionStats.running > 0 && (_jsx("div", { className: "p-4 bg-green-900/20 border-b border-green-700/30", children: _jsx("div", { className: "text-sm text-green-400", children: _jsxs("strong", { children: ["Running: ", sessionStats.running] }) }) })), sessionStats.stopped > 0 && (_jsx("div", { className: "p-4 bg-gray-700/20 border-b border-gray-700/30", children: _jsx("div", { className: "text-sm text-gray-400", children: _jsxs("strong", { children: ["Stopped: ", sessionStats.stopped] }) }) })), sessionStats.error > 0 && (_jsx("div", { className: "p-4 bg-red-900/20 border-b border-red-700/30", children: _jsx("div", { className: "text-sm text-red-400", children: _jsxs("strong", { children: ["Error: ", sessionStats.error] }) }) })), sessionStats.totalSessions === 0 && (_jsx("div", { className: "p-4 text-center text-gray-500", children: "No sessions. Initialize to get started." }))] })] })] })), activeTab === 'config' && (_jsx("div", { className: "space-y-6", children: _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [_jsxs("div", { className: "bg-gray-800 rounded-lg p-6 border border-gray-700", children: [_jsx("h3", { className: "text-lg font-semibold text-white mb-4", children: "Auto-Detect Configurations" }), _jsx("p", { className: "text-gray-400 mb-4", children: "Scan common configuration paths for MCP server configs" }), _jsx("button", { onClick: handleDetectConfigs, disabled: loading, className: "w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors", children: loading ? 'Scanning...' : 'Detect Configs' })] }), _jsxs("div", { className: "bg-gray-800 rounded-lg p-6 border border-gray-700", children: [_jsx("h3", { className: "text-lg font-semibold text-white mb-4", children: "Import Configurations" }), _jsx("p", { className: "text-gray-400 mb-4", children: "Import MCP configurations from JSON files" }), _jsx("div", { className: "mt-4 p-4 bg-gray-900/50 rounded border border-gray-700", children: _jsx("input", { type: "file", multiple: true, accept: ".json", className: "w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600" }) })] }), _jsxs("div", { className: "bg-gray-800 rounded-lg p-6 border border-gray-700", children: [_jsx("h3", { className: "text-lg font-semibold text-white mb-4", children: "Export Configurations" }), _jsx("p", { className: "text-gray-400 mb-4", children: "Export current configurations to various formats" }), _jsxs("div", { className: "grid grid-cols-2 gap-4 mt-4", children: [_jsx("button", { onClick: () => console.log('Export: AIOS format'), disabled: loading, className: "bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-medium transition-colors", children: loading ? 'Exporting...' : 'AIOS' }), _jsx("button", { onClick: () => console.log('Export: Claude format'), disabled: loading, className: "bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg font-medium transition-colors", children: loading ? 'Exporting...' : 'Claude' }), _jsx("button", { onClick: () => console.log('Export: OpenAI format'), disabled: loading, className: "bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors", children: loading ? 'Exporting...' : 'OpenAI' }), _jsx("button", { onClick: () => console.log('Export: Google format'), disabled: loading, className: "bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-medium transition-colors", children: loading ? 'Exporting...' : 'Google' })] })] })] }) })), loading && (_jsx("div", { className: "fixed inset-0 bg-black/80 flex items-center justify-center z-50", children: _jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 border-t-transparent" }) }))] }));
    div >
    ;
    ;
}
