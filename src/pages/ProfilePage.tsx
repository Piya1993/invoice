"use client";

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import useCompanySettings from '@/hooks/useCompanySettings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Building, KeyRound } from 'lucide-react';
import { Link } from 'react-router-dom'; // Import Link for navigation

const ProfilePage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { company, loading: companySettingsLoading } = useCompanySettings();

  if (authLoading || companySettingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p>Please log in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">User Profile</h1>
      
      <Card className="max-w-lg mx-auto mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="mr-2 h-5 w-5" /> Your Account Information
          </CardTitle>
          <CardDescription>Manage your personal details.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p><strong>Email:</strong> {user.email}</p>
          {company && (
            <p className="flex items-center">
              <Building className="mr-2 h-4 w-4 text-muted-foreground" />
              <strong>Company:</strong> {company.name}
            </p>
          )}
          <p className="text-muted-foreground text-sm">
            For company-wide settings, please visit the <Link to="/settings" className="text-primary hover:underline">Settings page</Link>.
          </p>
        </CardContent>
      </Card>

      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center">
            <KeyRound className="mr-2 h-5 w-5" /> Change Password
          </CardTitle>
          <CardDescription>
            For security reasons, password changes are handled through a secure reset process.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            If you wish to change your password, please use the password reset flow.
            This ensures your account remains secure.
          </p>
          <Link to="/reset-password">
            <Button className="w-full">
              Go to Password Reset
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;