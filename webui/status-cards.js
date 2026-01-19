/**
 * AIOS MCP Router - Status Cards Component
 *
 * Displays key statistics for registry, sessions, and system health.
 */
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../packages/ui/src/components/ui/card';
import { Badge } from '../packages/ui/src/components/ui/badge';
function StatusCard({ title, value, description, trend, icon, color = 'green' }) {
    const getColorStyles = (color) => {
        const styles = {
            green: 'bg-green-500/20 text-green-900',
            yellow: 'bg-yellow-500/20 text-yellow-900',
            red: 'bg-red-500/20 text-red-900',
            blue: 'bg-blue-500/20 text-blue-900'
        };
        return styles[color] || styles.green;
    };
    const bgColor = getColorStyles(color)?.split(' ')[0] || getColorStyles('green').split(' ')[0];
    return (_jsx(Card, { className: "hover:shadow-lg transition-shadow", children: _jsxs(CardContent, { children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex-1", children: [_jsx(CardHeader, { className: "text-sm font-medium text-gray-600", children: title }), icon && _jsx("span", { className: "text-2xl ml-2", children: icon }), _jsx(CardTitle, { className: "text-4xl font-bold", children: typeof value === 'number' ? value.toLocaleString() : value }), trend && (_jsxs("div", { className: "flex items-center text-sm text-gray-500 ml-4", children: [_jsx("span", { className: trend.value >= 0 ? 'text-green-500' : 'text-red-500', children: trend.value >= 0 ? '↑' : '↓' }), _jsx("span", { className: "ml-1", children: trend.label })] }))] }), _jsx(Badge, { variant: color === 'green' ? 'default' : color === 'yellow' ? 'secondary' : color === 'red' ? 'destructive' : 'default', children: typeof value === 'number' ? value : 'OK' })] }), description && (_jsx(CardDescription, { className: "text-gray-600", children: description }))] }) }));
}
export function MCPRouterStats({ registryStats, sessionStats, healthStatus, loading = false }) {
    return (_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: [_jsx(StatusCard, { title: "Total Servers", value: registryStats?.totalServers || 0, description: `From ${registryStats?.categories || 0} registries`, icon: "\uD83D\uDCE6", color: "blue" }), _jsx(StatusCard, { title: "Installed", value: registryStats?.installedServers || 0, description: "Ready to use", icon: "\u2713", color: "green" }), _jsx(StatusCard, { title: "Running Sessions", value: sessionStats?.running ?? 0, description: sessionStats ? `${sessionStats.stopped} stopped, ${sessionStats.error} errors` : undefined, icon: "\u25B6\uFE0F", color: sessionStats?.running ?? 0 > 0 ? 'green' : 'yellow' }), _jsx(StatusCard, { title: "Total Clients", value: sessionStats?.totalClients ?? 0, description: "Active connections", icon: "\uD83D\uDC65", color: "blue" }), _jsx(StatusCard, { title: "System Health", value: healthStatus?.status === 'healthy' ? 'OK' : healthStatus?.status?.toUpperCase(), description: `Uptime: ${healthStatus?.uptime ? Math.floor(healthStatus.uptime / 60).toFixed(1) + 'm' : 'N/A'}`, icon: healthStatus?.status === 'healthy' ? '✓' : '⚠️', color: healthStatus?.status === 'healthy' ? 'green' : healthStatus?.status === 'degraded' ? 'yellow' : 'red', trend: healthStatus?.uptime ? { value: healthStatus.uptime - (healthStatus.uptime * 0.95), label: '1h ago' } : undefined })] }));
}
export default MCPRouterStats;
