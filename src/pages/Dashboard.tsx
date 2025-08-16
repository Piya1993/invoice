"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, fromSmallestUnit } from '@/lib/utils';
import Decimal from 'decimal.js';
import { DollarSign, FileText, TrendingUp, Wallet } from 'lucide-react';
import { Tables } from '@/types/supabase';

// Extend Invoice type to include related client and invoice_items for calculations
type InvoiceWithDetails = Tables<'invoices'> & {
  clients: Tables<'clients'>;
  invoice_items: Tables<'invoice_items'>[];
};

const Dashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    totalInvoices: 0,
    totalRevenue: new Decimal(0),
    totalOutstanding: new Decimal(0),
    totalPaidAmount: new Decimal(0),
    currency: 'PKR', // Default currency, will be updated from company settings
  });

  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id, currency')
        .eq('created_by', user.id)
        .single();

      if (companyError || !companyData) {
        throw new Error('Could not find company for the current user. Please ensure your company is set up.');
      }
      const companyId = companyData.id;
      const companyCurrency = companyData.currency || 'PKR';

      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .eq('company_id', companyId);

      if (invoicesError) throw invoicesError;

      let totalInvoices = invoicesData.length;
      let totalRevenue = new Decimal(0);
      let totalOutstanding = new Decimal(0);
      let totalPaidAmount = new Decimal(0);

      invoicesData.forEach(invoice => {
        totalRevenue = totalRevenue.plus(fromSmallestUnit(invoice.total));
        totalOutstanding = totalOutstanding.plus(fromSmallestUnit(invoice.amount_due));
        totalPaidAmount = totalPaidAmount.plus(fromSmallestUnit(invoice.amount_paid));
      });

      setDashboardData({
        totalInvoices,
        totalRevenue,
        totalOutstanding,
        totalPaidAmount,
        currency: companyCurrency,
      });

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      toast.error(error.message || 'Failed to fetch dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user && !authLoading) {
      router.push('/auth');
    } else if (user && !authLoading) {
      fetchDashboardData();
    }
  }, [user, authLoading, router, fetchDashboardData]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Signed out successfully!');
    }
  };

  if (authLoading || loading) {
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
    <div className="flex flex-col min-h-screen bg-background p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Welcome, {user.email}!</h1>
        <Button onClick={handleSignOut}>Sign Out</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.totalInvoices}</div>
            <p className="text-xs text-muted-foreground">
              All invoices created
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboardData.totalRevenue, dashboardData.currency)}</div>
            <p className="text-xs text-muted-foreground">
              Sum of all invoice totals
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Amount Paid</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboardData.totalPaidAmount, dashboardData.currency)}</div>
            <p className="text-xs text-muted-foreground">
              Total payments received
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Amount Outstanding</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboardData.totalOutstanding, dashboardData.currency)}</div>
            <p className="text-xs text-muted-foreground">
              Total amount still due
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <p className="text-lg text-muted-foreground">
          This is your central hub. Navigate using the sidebar to manage your invoices, clients, and products.
        </p>
      </div>
    </div>
  );
};

export default Dashboard;