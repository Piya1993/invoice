"use client";

import React, { ReactNode, useEffect, useState, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/context/AuthContext';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import useCompanySettings from '@/hooks/useCompanySettings'; // Import the new hook

interface LayoutProps {
  // children: ReactNode; // No longer needed with Outlet
}

const Layout: React.FC<LayoutProps> = () => {
  const { user, loading: authLoading } = useAuth();
  const { company, loading: companySettingsLoading, error: companySettingsError } = useCompanySettings(); // Use the new hook
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (authLoading || companySettingsLoading) {
      // Still loading authentication or company data, do nothing yet
      return;
    }

    if (!user) {
      // If not authenticated, redirect to auth page
      navigate('/auth');
      return;
    }

    // If user is authenticated
    if (!company) {
      // If no company is found for the user
      if (location.pathname !== '/setup-company') {
        // If not already on the setup page, redirect to setup
        navigate('/setup-company');
      }
    } else {
      // If a company is found for the user
      if (location.pathname === '/setup-company') {
        // If on the setup page but company is already set up, redirect to dashboard
        navigate('/dashboard');
      }
    }
  }, [user, authLoading, company, companySettingsLoading, navigate, location.pathname]);

  if (authLoading || companySettingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p>Loading application...</p>
      </div>
    );
  }

  if (!user) {
    return null; // Redirect will happen in useEffect
  }

  // If user is logged in and company status is determined, render layout
  return (
    <div className="flex h-screen bg-background text-foreground">
      <aside className="w-64 flex-shrink-0">
        <Sidebar />
      </aside>
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet /> {/* Renders the matched child route component */}
      </main>
    </div>
  );
};

export default Layout;