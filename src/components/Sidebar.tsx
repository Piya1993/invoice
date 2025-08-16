"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { Home, FileText, Users, Package, BarChart, Settings, LogOut, User } from 'lucide-react'; // Added User icon
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

const Sidebar: React.FC = () => {
  const { user } = useAuth();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Signed out successfully!');
    }
  };

  return (
    <div className="flex flex-col h-full bg-card text-card-foreground border-r p-4 shadow-sm">
      <div className="flex items-center justify-center h-16 border-b mb-6">
        <h2 className="text-2xl font-bold text-primary">Invoice App</h2>
      </div>
      <nav className="flex-1 space-y-2">
        <Link to="/dashboard">
          <Button variant="ghost" className="w-full justify-start text-lg py-6">
            <Home className="mr-3 h-5 w-5" />
            Dashboard
          </Button>
        </Link>
        <Link to="/invoices">
          <Button variant="ghost" className="w-full justify-start text-lg py-6">
            <FileText className="mr-3 h-5 w-5" />
            Invoices
          </Button>
        </Link>
        <Link to="/clients">
          <Button variant="ghost" className="w-full justify-start text-lg py-6">
            <Users className="mr-3 h-5 w-5" />
            Clients
          </Button>
        </Link>
        <Link to="/products">
          <Button variant="ghost" className="w-full justify-start text-lg py-6">
            <Package className="mr-3 h-5 w-5" />
            Products
          </Button>
        </Link>
        <Link to="/reports">
          <Button variant="ghost" className="w-full justify-start text-lg py-6">
            <BarChart className="mr-3 h-5 w-5" />
            Reports
          </Button>
        </Link>
        <Link to="/settings">
          <Button variant="ghost" className="w-full justify-start text-lg py-6">
            <Settings className="mr-3 h-5 w-5" />
            Settings
          </Button>
        </Link>
        <Link to="/profile"> {/* New Profile Link */}
          <Button variant="ghost" className="w-full justify-start text-lg py-6">
            <User className="mr-3 h-5 w-5" />
            Profile
          </Button>
        </Link>
      </nav>
      <div className="mt-auto pt-4 border-t">
        {user && (
          <div className="text-sm text-muted-foreground mb-2 px-3">
            Signed in as: <span className="font-medium">{user.email}</span>
          </div>
        )}
        <Button variant="ghost" className="w-full justify-start text-lg py-6" onClick={handleSignOut}>
          <LogOut className="mr-3 h-5 w-5" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;