"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const ReportsPage: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Reports & Analytics</h1>
      <p className="text-muted-foreground mb-8">
        Gain insights into your business with detailed reports.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Invoice Summary</CardTitle>
            <CardDescription>Overview of your invoices by status and total amounts.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>Total Invoices: <span className="font-semibold">0</span></p>
              <p>Paid Invoices: <span className="font-semibold">0</span></p>
              <p>Outstanding Invoices: <span className="font-semibold">0</span></p>
              <p>Total Revenue: <span className="font-semibold">PKR 0.00</span></p>
            </div>
            <Separator className="my-4" />
            <p className="text-sm text-muted-foreground">
              (Detailed charts and filters will be added here.)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Client Activity</CardTitle>
            <CardDescription>Track invoice activity and spending per client.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>Total Clients: <span className="font-semibold">0</span></p>
              <p>Top Client (by revenue): <span className="font-semibold">N/A</span></p>
              <p>New Clients (last 30 days): <span className="font-semibold">0</span></p>
            </div>
            <Separator className="my-4" />
            <p className="text-sm text-muted-foreground">
              (Client-specific reports and graphs will be added here.)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Product/Service Performance</CardTitle>
            <CardDescription>Analyze which products or services are most popular.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>Total Products: <span className="font-semibold">0</span></p>
              <p>Best Selling Product: <span className="font-semibold">N/A</span></p>
              <p>Total Product Revenue: <span className="font-semibold">PKR 0.00</span></p>
            </div>
            <Separator className="my-4" />
            <p className="text-sm text-muted-foreground">
              (Product sales data and trends will be displayed here.)
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 text-center text-muted-foreground">
        <p>More detailed reports and customization options coming soon!</p>
      </div>
    </div>
  );
};

export default ReportsPage;