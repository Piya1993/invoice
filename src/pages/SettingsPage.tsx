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

const SettingsPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [company, setCompany] = useState<Tables<'companies'> | null>(null);
  const [settings, setSettings] = useState<Tables<'settings'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Fetch company data
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('created_by', user.id)
        .single();

      if (companyError) throw companyError;
      if (!companyData) {
        throw new Error('No company found for this user.');
      }
      setCompany(companyData);

      // Fetch settings data for the company
      const { data: settingsData, error: settingsError } = await supabase
        .from('settings')
        .select('*')
        .eq('company_id', companyData.id)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') { // PGRST116 means no rows found
        throw settingsError;
      }
      setSettings(settingsData); // Will be null if no settings found

    } catch (error: any) {
      console.error('Error fetching settings:', error);
      toast.error(error.message || 'Failed to fetch settings.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchSettings();
    }
  }, [user, authLoading, fetchSettings]);

  const handleSaveSettings = (updatedCompany: Tables<'companies'>, updatedSettings: Tables<'settings'>) => {
    setCompany(updatedCompany);
    setSettings(updatedSettings);
    setIsFormOpen(false);
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p>Loading settings...</p>
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