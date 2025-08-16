"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import useCompanySettings from '@/hooks/useCompanySettings'; // Import the new hook
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'react-hot-toast';
import { User, Building, KeyRound } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

const ProfilePage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { company, loading: companySettingsLoading } = useCompanySettings(); // Use the new hook

  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordUpdateLoading, setPasswordUpdateLoading] = useState(false);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordUpdateLoading(true);

    if (newPassword !== confirmNewPassword) {
      toast.error('New passwords do not match.');
      setPasswordUpdateLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      setPasswordUpdateLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success('Password updated successfully!');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast.error(error.message || 'Failed to update password.');
    } finally {
      setPasswordUpdateLoading(false);
    }
  };

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
            For company-wide settings, please visit the <a href="/settings" className="text-primary hover:underline">Settings page</a>.
          </p>
        </CardContent>
      </Card>

      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center">
            <KeyRound className="mr-2 h-5 w-5" /> Change Password
          </CardTitle>
          <CardDescription>Update your account password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordUpdate} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={passwordUpdateLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
              <Input
                id="confirmNewPassword"
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
                disabled={passwordUpdateLoading}
              />
            </div>
            <Button type="submit" disabled={passwordUpdateLoading}>
              {passwordUpdateLoading ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;