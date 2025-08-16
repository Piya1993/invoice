"use client";

import React from 'react';

const InvoicesPage: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Invoices</h1>
      <p className="text-muted-foreground">Manage your invoices here.</p>
      {/* Invoice list, filters, search, new invoice button will go here */}
    </div>
  );
};

export default InvoicesPage;