"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user || null);
        setLoading(false);

        if (event === 'SIGNED_OUT') {
          router.push('/auth');
          toast.info('You have been signed out.');
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // If a user signs in and doesn't have a company, create one for them.
          // This is a simplified approach for initial setup.
          if (currentSession?.user && !session?.user) { // Only run if a new user signs in
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
              const { error: insertError } = await supabase
                .from('companies')
                .insert({
                  name: `${currentSession.user.email?.split('@')[0]}'s Company`,
                  created_by: currentSession.user.id,
                });

              if (insertError) {
                console.error('Error creating company:', insertError);
                toast.error('Failed to create company for new user.');
              } else {
                toast.success('Welcome! Your company has been created.');
              }
            }
          }
          router.push('/dashboard');
        }
      }
    );

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user || null);
      setLoading(false);
    });

    return () => {
      authListener.unsubscribe();
    };
  }, [router, session?.user]);

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