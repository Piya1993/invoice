"use client";

import React, { ReactNode, useEffect, useState, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom'; // Corrected import
import { supabase } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [companySetupChecked, setCompanySetupChecked] = useState(false);

  const checkCompanySetup = useCallback(async () => {
    if (!user) return;

    try {
      const { data: companies, error } = await supabase
        .from('companies')
        .select('name')
        .eq('created_by', user.id)
        .limit(1);

      if (error) throw error;

      const companyName = companies?.[0]?.name;
      const defaultCompanyNamePattern = new RegExp(`^${user.email?.split('@')[0]}'s Company$`);

      // If company name is default or empty, and not already on setup page, redirect
      if ((!companyName || defaultCompanyNamePattern.test(companyName)) && location.pathname !== '/setup-company') {
        navigate('/setup-company');
      } else if (companyName && !defaultCompanyNamePattern.test(companyName) && location.pathname === '/setup-company') {
        // If company setup is complete and user is on setup page, redirect to dashboard
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Error checking company setup in Layout:', error);
      toast.error('Failed to verify company setup.');
      navigate('/auth'); // Critical error, redirect to auth
    } finally {
      setCompanySetupChecked(true);
    }
  }, [user, navigate, location.pathname]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/auth'); // Redirect to auth if not logged in
      } else if (!companySetupChecked) {
        checkCompanySetup(); // Check company setup once user is loaded
      }
    }
  }, [user, authLoading, navigate, companySetupChecked, checkCompanySetup]);

  if (authLoading || !companySetupChecked) { // Wait for auth and company setup check
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p>Loading application...</p>
      </div>
    );
  }

  if (!user) {
    return null; // Redirect will happen in useEffect
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      <aside className="w-64 flex-shrink-0">
        <Sidebar />
      </aside>
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  );
};

export default Layout;