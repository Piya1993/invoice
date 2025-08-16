"use client";

import React from 'react';

const ClientsPage: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Clients</h1>
      <p className="text-muted-foreground">Manage your clients here.</p>
      {/* Client list, filters, search, new client button will go here */}
    </div>
  );
};

export default ClientsPage;