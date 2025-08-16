"use client";

import React, { useState, useEffect, useCallback } from 'react';
import SettingsForm from '@/components/SettingsForm';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Tables } from '@/types/supabase';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import useCompany from '@/hooks/useCompany'; // Import the new hook

const CompanySetupPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { company, loading: companyLoading, error: companyError } = useCompany(); // Use the new hook
  const navigate = useNavigate();
  const [settings, setSettings] = useState<Tables<'settings'> | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true); // New state for settings loading

  const fetchSettingsForCompany = useCallback(async () => {
    if (!company?.id) {
      setLoadingSettings(false);
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
      console.error('Error fetching settings for company setup:', error);
      toast.error(error.message || 'Failed to load settings for company setup.');
    } finally {
      setLoadingSettings(false);
    }
  }, [company]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (!authLoading && user && !companyLoading) {
      // If company is loaded (or determined not to exist)
      if (company) {
        fetchSettingsForCompany(); // Fetch settings if company exists
      } else {
        setLoadingSettings(false); // No company, so no settings to load
      }
    }
  }, [user, authLoading, company, companyLoading, navigate, fetchSettingsForCompany]);

  const handleSave = (updatedCompany: Tables<'companies'>, updatedSettings: Tables<'settings'>) => {
    // After saving, the useCompany hook will re-fetch and update 'company' state globally.
    // We just need to update local 'settings' state and navigate.
    setSettings(updatedSettings);
    toast.success('Company setup complete! Redirecting to dashboard.');
    navigate('/dashboard');
  };

  if (authLoading || companyLoading || loadingSettings) { // Combine loading states
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p>Loading setup...</p>
      </div>
    );
  }

  if (!user) {
    return null; // Redirect handled by useEffect
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <SettingsForm
        isOpen={true}
        onClose={() => { /* No direct close, handled by save/redirect */ }}
        onSave={handleSave}
        initialCompanyData={company} // Pass company from hook
        initialSettingsData={settings}
        isInitialSetup={!company}
      />
    </div>
  );
};

export default CompanySetupPage;