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
  const [loading, setLoading] = useState(true);

  const fetchCompanyAndSettings = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('created_by', user.id)
        .single();

      if (companyError) throw companyError;
      setCompany(companyData);

      const { data: settingsData, error: settingsError } = await supabase
        .from('settings')
        .select('*')
        .eq('company_id', companyData.id)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') {
        throw settingsError;
      }
      setSettings(settingsData);

    } catch (error: any) {
      console.error('Error fetching company/settings for setup:', error);
      toast.error(error.message || 'Failed to load company setup data.');
      navigate('/dashboard'); // Fallback to dashboard on critical error
    } finally {
      setLoading(false);
    }
  }, [user, navigate]);

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
    // After saving, check if the company name is no longer the default
    const defaultCompanyNamePattern = new RegExp(`^${user?.email?.split('@')[0]}'s Company$`);
    if (updatedCompany.name && !defaultCompanyNamePattern.test(updatedCompany.name)) {
      toast.success('Company setup complete! Redirecting to dashboard.');
      navigate('/dashboard');
    } else {
      toast.info('Please update your company name to complete setup.');
    }
  };

  if (authLoading || loading) {
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
        isInitialSetup={true} // Pass this prop
      />
    </div>
  );
};

export default CompanySetupPage;