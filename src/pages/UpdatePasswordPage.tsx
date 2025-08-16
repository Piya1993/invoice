"use client";

import React from 'react';
import UpdatePasswordForm from '@/components/UpdatePasswordForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { KeyRound } from 'lucide-react';

const UpdatePasswordPage: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-center text-2xl">
            <KeyRound className="mr-2 h-5 w-5" /> Set New Password
          </CardTitle>
          <CardDescription className="text-center">
            Enter your new password below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UpdatePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
};

export default UpdatePasswordPage;