'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AI_Tools_Dashboard() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">AI Tools & Integration</h1>
      <p className="text-muted-foreground">Manage external tools, MCP servers, and submodules.</p>
      
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tool Index</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Tool Name</th>
                    <th className="text-left py-2">Category</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-left py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2">Metamcp</td>
                    <td>Directory</td>
                    <td className="text-green-500">Indexed</td>
                    <td><button className="text-blue-500">Configure</button></td>
                  </tr>
                  <tr>
                    <td className="py-2">Browser Use</td>
                    <td>Automation</td>
                    <td className="text-yellow-500">Pending</td>
                    <td><button className="text-blue-500">Install</button></td>
                  </tr>
                  {/* Dynamic content will be loaded here from resource-index.json */}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
