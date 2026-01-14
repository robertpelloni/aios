'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BillingPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Usage & Billing</h1>
      <p className="text-muted-foreground">Monitor API usage, quotas, and subscription status.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>OpenAI</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$12.45</div>
            <p className="text-xs text-muted-foreground">This month</p>
            <div className="mt-4 w-full bg-gray-200 h-2 rounded-full">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: '40%' }}></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Anthropic</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold">$45.00</div>
             <p className="text-xs text-muted-foreground">Credits Remaining</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Google Vertex</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0.00</div>
            <p className="text-xs text-muted-foreground">Free Tier</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
