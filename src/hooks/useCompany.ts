"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Tables } from '@/types/supabase';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';

interface UseCompanyResult {
  company: Tables<'companies'> | null;
  loading: boolean;
  error: string | null;
}

const useCompany = (): UseCompanyResult => {
  const { user, loading: authLoading } = useAuth();
  const [company, setCompany] = useState<Tables<'companies'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompany = useCallback(async () => {
    if (!user?.id) {
      setCompany(null);
      setLoading(false);
      setError('User not authenticated.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('companies')
        .select('*')
        .eq('created_by', user.id)
        .single();

      if (supabaseError) {
        if (supabaseError.code === 'PGRST116') { // No rows found
          setError('No company found for this user. Please set up your company.');
          setCompany(null);
        } else {
          throw supabaseError;
        }
      } else {
        setCompany(data);
      }
    } catch (err: any) {
      console.error('Error fetching company:', err);
      setError(err.message || 'Failed to fetch company details.');
      setCompany(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchCompany();
    }
  }, [authLoading, fetchCompany]);

  return { company, loading, error };
};

export default useCompany;