"use client";

import React from 'react';
import AuthForm from '@/components/AuthForm';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom'; // Corrected import
import { useEffect } from 'react';

const AuthPage: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !loading) {
      // AuthContext no longer redirects to dashboard directly.
      // Layout will handle the initial setup check and redirection.
      // For AuthPage, if user is logged in, we can still push to dashboard as a default.
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p>Loading authentication...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <AuthForm />
    </div>
  );
};

export default AuthPage;