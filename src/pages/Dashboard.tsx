"use client";

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';

const Dashboard: React.FC = () => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user && !loading) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Signed out successfully!');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to auth page
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <h1 className="text-4xl font-bold mb-4">Welcome to your Dashboard, {user.email}!</h1>
      <p className="text-lg text-muted-foreground mb-8">
        This is a protected route. You are successfully authenticated.
      </p>
      <Button onClick={handleSignOut}>Sign Out</Button>
    </div>
  );
};

export default Dashboard;