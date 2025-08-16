"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const Index: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
      <h1 className="text-5xl font-bold mb-4">Invoice Generator</h1>
      <p className="text-xl text-muted-foreground mb-8">
        Your local-first solution for managing invoices.
      </p>
      <div className="space-x-4">
        <Link href="/auth">
          <Button size="lg">Get Started</Button>
        </Link>
        <Link href="/dashboard">
          <Button size="lg" variant="outline">Go to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
};

export default Index;