"use client";

import React, { useState, useEffect, useCallback } from 'react';
import SettingsForm from '@/components/SettingsForm';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Tables } from '@/types/supabase';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import useCompanySettings from '@/hooks/useCompanySettings'; // Import the new hook

const CompanySetupPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { company, settings, loading: companySettingsLoading, error: companySettingsError, refetch: refetchCompanySettings } = useCompanySettings(); // Use the new hook
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (!companySettingsLoading && user) {
      // If company is already set up, redirect to dashboard
      if (company) {
        navigate('/dashboard');
      }
      // If no company and no error, it means it's a new user needing setup, so stay on this page.
    }
  }, [user, authLoading, company, companySettingsLoading, navigate]);

  const handleSave = (updatedCompany: Tables<'companies'>, updatedSettings: Tables<'settings'>) => {
    // After saving, trigger a refetch in the hook to update global state
    refetchCompanySettings();
    toast.success('Company setup complete! Redirecting to dashboard.');
    navigate('/dashboard');
  };

  if (authLoading || companySettingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p>Loading setup...</p>
      </div>
    );
  }

  if (!user) {
    return null; // Redirect handled by useEffect
  }

  // If company exists, useEffect will redirect to dashboard.
  // If company does not exist, render the form for initial setup.
  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <SettingsForm
        isOpen={true}
        onClose={() => { /* No direct close, handled by save/redirect */ }}
        onSave={handleSave}
        initialCompanyData={company} // Pass company from hook
        initialSettingsData={settings} // Pass settings from hook
        isInitialSetup={!company}
      />
    </div>
  );
};

export default CompanySetupPage;