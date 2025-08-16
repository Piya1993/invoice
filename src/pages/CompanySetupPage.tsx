"use client";

import React, { useState, useEffect, useCallback } from 'react';
import SettingsForm from '@/components/SettingsForm';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Tables } from '@/types/supabase';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const CompanySetupPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [company, setCompany] = useState<Tables<'companies'> | null>(null);
  const [settings, setSettings] = useState<Tables<'settings'> | null>(null);
  const [loadingData, setLoadingData] = useState(true); // Renamed to avoid conflict with authLoading

  const fetchCompanyAndSettings = useCallback(async () => {
    if (!user?.id) {
      setLoadingData(false);
      return;
    }

    setLoadingData(true);
    try {
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('created_by', user.id)
        .single();

      if (companyError && companyError.code !== 'PGRST116') { // PGRST116 means no rows found
        throw companyError;
      }
      setCompany(companyData); // companyData will be null if no company found

      if (companyData) {
        const { data: settingsData, error: settingsError } = await supabase
          .from('settings')
          .select('*')
          .eq('company_id', companyData.id)
          .single();

        if (settingsError && settingsError.code !== 'PGRST116') {
          throw settingsError;
        }
        setSettings(settingsData); // settingsData will be null if no settings found
      } else {
        setSettings(null); // Ensure settings is null if no company
      }

    } catch (error: any) {
      console.error('Error fetching company/settings for setup:', error);
      toast.error(error.message || 'Failed to load company setup data.');
      // If there's a critical error fetching, we might still want to allow setup
      // but for now, let's just log and proceed with null data.
    } finally {
      setLoadingData(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchCompanyAndSettings();
    } else if (!authLoading && !user) {
      navigate('/auth'); // Redirect to auth if not logged in
    }
  }, [user, authLoading, fetchCompanyAndSettings, navigate]);

  const handleSave = (updatedCompany: Tables<'companies'>, updatedSettings: Tables<'settings'>) => {
    setCompany(updatedCompany);
    setSettings(updatedSettings);
    toast.success('Company setup complete! Redirecting to dashboard.');
    navigate('/dashboard');
  };

  if (authLoading || loadingData) {
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
        isOpen={true} // Always open for this page
        onClose={() => { /* No direct close, handled by save/redirect */ }}
        onSave={handleSave}
        initialCompanyData={company}
        initialSettingsData={settings}
        isInitialSetup={!company} // Pass true if no company exists yet
      />
    </div>
  );
};

export default CompanySetupPage;