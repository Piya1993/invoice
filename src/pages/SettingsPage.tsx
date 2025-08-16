"use client";

import React from 'react';

const SettingsPage: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      <p className="text-muted-foreground">Configure your application settings here.</p>
      {/* Company settings, numbering, currency, locale, timezone will go here */}
    </div>
  );
};

export default SettingsPage;