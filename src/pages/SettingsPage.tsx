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
import useCompany from '@/hooks/useCompany'; // Import the new hook
import { useNavigate } from 'react-router-dom'; // Import useNavigate

const SettingsPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { company, loading: companyLoading, error: companyError } = useCompany(); // Use the new hook
  const navigate = useNavigate();
  const [settings, setSettings] = useState<Tables<'settings'> | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true); // New state for settings loading
  const [isFormOpen, setIsFormOpen] = useState(false);

  const fetchSettingsForCompany = useCallback(async () => {
    if (!company?.id) {
      setLoadingSettings(false);
      setSettings(null); // Ensure settings is null if no company
      return;
    }
    setLoadingSettings(true);
    try {
      const { data: settingsData, error: settingsError } = await supabase
        .from('settings')
        .select('*')
        .eq('company_id', company.id)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') {
        throw settingsError;
      }
      setSettings(settingsData);
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      toast.error(error.message || 'Failed to fetch settings.');
      setSettings(null);
    } finally {
      setLoadingSettings(false);
    }
  }, [company]);

  useEffect(() => {
    if (!authLoading && user && !companyLoading) {
      fetchSettingsForCompany();
    }
  }, [user, authLoading, company, companyLoading, fetchSettingsForCompany]);

  const handleSaveSettings = (updatedCompany: Tables<'companies'>, updatedSettings: Tables<'settings'>) => {
    // The useCompany hook will re-fetch and update 'company' state globally.
    // We just need to update local 'settings' state.
    setSettings(updatedSettings);
    setIsFormOpen(false);
  };

  if (authLoading || companyLoading || loadingSettings) { // Combine loading states
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p>Loading settings...</p>
      </div>
    );
  }

  if (companyError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
        <h2 className="text-xl font-semibold text-red-600 mb-4">Error: {companyError}</h2>
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