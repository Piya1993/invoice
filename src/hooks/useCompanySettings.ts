"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Tables } from '@/types/supabase';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';

interface UseCompanySettingsResult {
  company: Tables<'companies'> | null;
  settings: Tables<'settings'> | null;
  loading: boolean;
  error: string | null;
  refetch: () => void; // Add a refetch function
}

const useCompanySettings = (): UseCompanySettingsResult => {
  const { user, loading: authLoading } = useAuth();
  const [company, setCompany] = useState<Tables<'companies'> | null>(null);
  const [settings, setSettings] = useState<Tables<'settings'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user?.id) {
      setCompany(null);
      setSettings(null);
      setLoading(false);
      setError('User not authenticated.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Fetch company
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('created_by', user.id)
        .single();

      if (companyError) {
        if (companyError.code === 'PGRST116') { // No rows found
          setError('No company found for this user. Please set up your company.');
          setCompany(null);
          setSettings(null);
        } else {
          throw companyError;
        }
      } else {
        setCompany(companyData);

        // If company found, fetch settings
        const { data: settingsData, error: settingsError } = await supabase
          .from('settings')
          .select('*')
          .eq('company_id', companyData.id)
          .single();

        if (settingsError && settingsError.code !== 'PGRST116') {
          throw settingsError;
        }
        setSettings(settingsData);
      }
    } catch (err: any) {
      console.error('Error fetching company and settings:', err);
      setError(err.message || 'Failed to fetch company and settings details.');
      setCompany(null);
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [authLoading, fetchData]);

  return { company, settings, loading, error, refetch: fetchData };
};

export default useCompanySettings;