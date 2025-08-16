"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom'; // Corrected import
import { toast } from 'react-hot-toast';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user || null);
        setLoading(false);

        if (event === 'SIGNED_OUT') {
          navigate('/auth');
          toast.info('You have been signed out.');
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (currentSession?.user) {
            // Check if a company exists for the user. If not, create a basic one.
            // This logic remains to ensure a company always exists.
            const { data: companies, error: companyError } = await supabase
              .from('companies')
              .select('id')
              .eq('created_by', currentSession.user.id)
              .limit(1);

            if (companyError) {
              console.error('Error checking company:', companyError);
              toast.error('Failed to check company status.');
            } else if (!companies || companies.length === 0) {
              // No company found for this user, create one
              const { data: newCompany, error: insertCompanyError } = await supabase
                .from('companies')
                .insert({
                  name: `${currentSession.user.email?.split('@')[0]}'s Company`,
                  created_by: currentSession.user.id,
                })
                .select('id')
                .single();

              if (insertCompanyError) {
                console.error('Error creating company:', insertCompanyError);
                toast.error('Failed to create company for new user.');
              } else {
                toast.success('Welcome! Your company has been created.');

                // Also create default settings for the new company
                const { error: insertSettingsError } = await supabase
                  .from('settings')
                  .insert({
                    company_id: newCompany.id,
                    default_tax_rate: 0,
                    default_currency: 'PKR',
                    numbering_prefix: 'INV-',
                    next_number: 1,
                    locale: 'en-PK',
                    timezone: 'Asia/Karachi',
                  });

                if (insertSettingsError) {
                  console.error('Error creating default settings:', insertSettingsError);
                  toast.error('Failed to create default settings for new company.');
                } else {
                  toast.success('Default settings created.');
                }
              }
            }
            // Removed direct redirection to /dashboard or /setup-company here.
            // Layout component will handle redirection based on company setup.
          }
        }
      }
    );

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user || null);
      setLoading(false);
      // Removed direct redirection here.
    });

    return () => {
      authListener.unsubscribe();
    };
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ session, user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};