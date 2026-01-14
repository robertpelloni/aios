'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function JulesAutopilotPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Jules Autopilot Dashboard</h1>
      <p className="text-muted-foreground">Manage your Google Jules Cloud Development Environment.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Session Status</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Active Sessions: 0</p>
            <p>Pending Plans: 0</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Environment</CardTitle>
          </CardHeader>
          <CardContent>
             <p>Cloud Status: Disconnected</p>
             <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">Connect Jules</button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-32 bg-gray-900 text-green-400 p-2 text-xs font-mono overflow-y-auto">
              Waiting for connection...
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
