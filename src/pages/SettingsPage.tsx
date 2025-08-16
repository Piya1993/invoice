"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Edit } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Tables } from '@/types/supabase';
import { toast } from 'react-hot-toast';
import SettingsForm from '@/components/SettingsForm';
import { useAuth } from '@/context/AuthContext';
import useCompanySettings from '@/hooks/useCompanySettings'; // Import the new hook
import { useNavigate } from 'react-router-dom';

const SettingsPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { company, settings, loading: companySettingsLoading, error: companySettingsError, refetch: refetchCompanySettings } = useCompanySettings(); // Use the new hook
  const navigate = useNavigate();
  const [isFormOpen, setIsFormOpen] = useState(false);

  // No need for separate fetchSettingsForCompany or loadingSettings state here
  // as useCompanySettings provides both company and settings and their loading state.

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (!companySettingsLoading && companySettingsError) {
      toast.error(companySettingsError);
      // If there's an error and no company, suggest setup
      if (!company) {
        navigate('/setup-company');
      }
    }
  }, [user, authLoading, company, companySettingsLoading, companySettingsError, navigate]);

  const handleSaveSettings = (updatedCompany: Tables<'companies'>, updatedSettings: Tables<'settings'>) => {
    // After saving, trigger a refetch in the hook to update global state
    refetchCompanySettings();
    setIsFormOpen(false);
  };

  if (authLoading || companySettingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p>Loading settings...</p>
      </div>
    );
  }

  if (companySettingsError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
        <h2 className="text-xl font-semibold text-red-600 mb-4">Error: {companySettingsError}</h2>
        <p className="text-muted-foreground mb-4">Please ensure your company is set up correctly.</p>
        <Button onClick={() => navigate('/setup-company')}>Go to Company Setup</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <Button onClick={() => setIsFormOpen(true)}>
          <Edit className="mr-2 h-4 w-4" /> {settings ? 'Edit Settings' : 'Setup Settings'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Company Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {company ? (
            <>
              <p><strong>Company Name:</strong> {company.name}</p>
              <p><strong>Logo URL:</strong> {company.logo_url || 'N/A'}</p>
              <p><strong>Address:</strong> {company.address || 'N/A'}</p>
              <p><strong>Phone:</strong> {company.phone || 'N/A'}</p>
              <p><strong>Tax ID:</strong> {company.tax_id || 'N/A'}</p>
              <p><strong>Default Currency:</strong> {company.currency}</p>
            </>
          ) : (
            <p className="text-muted-foreground">No company details found. Please set up your company settings.</p>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Application Preferences</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {settings ? (
            <>
              <p><strong>Default Tax Rate:</strong> {settings.default_tax_rate}%</p>
              <p><strong>Invoice Numbering Prefix:</strong> {settings.numbering_prefix}</p>
              <p><strong>Next Invoice Number:</strong> {settings.next_number}</p>
              <p><strong>Locale:</strong> {settings.locale}</p>
              <p><strong>Timezone:</strong> {settings.timezone}</p>
            </>
          ) : (
            <p className="text-muted-foreground">No application preferences found. Click "Setup Settings" to configure them.</p>
          )}
        </CardContent>
      </Card>

      <SettingsForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveSettings}
        initialCompanyData={company}
        initialSettingsData={settings}
      />
    </div>
  );
};

export default SettingsPage;