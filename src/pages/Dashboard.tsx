"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, fromSmallestUnit } from '@/lib/utils';
import Decimal from 'decimal.js';
import { DollarSign, FileText, TrendingUp, Wallet, Clock, PlusCircle, Users, Package } from 'lucide-react';
import { Tables } from '@/types/supabase';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import useCompanySettings from '@/hooks/useCompanySettings';

// Extend Invoice type to include related client for display
type InvoiceWithClient = Tables<'invoices'> & {
  clients: Tables<'clients'>;
};

const Dashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { company, settings, loading: companySettingsLoading, error: companySettingsError, refetch: refetchCompanySettings } = useCompanySettings();
  const navigate = useNavigate();
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    totalInvoices: 0,
    totalRevenue: new Decimal(0),
    totalOutstanding: new Decimal(0),
    totalPaidAmount: new Decimal(0),
    currency: 'PKR', // Default currency, will be updated from company settings
    recentInvoices: [] as InvoiceWithClient[],
    overdueInvoices: [] as InvoiceWithClient[],
  });

  const fetchDashboardData = useCallback(async () => {
    if (!company?.id) {
      setLoadingDashboard(false);
      return;
    }

    setLoadingDashboard(true);
    try {
      const companyId = company.id;
      const companyCurrency = company.currency || 'PKR';

      // Fetch aggregated invoice data
      const { data: aggregatedData, error: aggregatedError } = await supabase
        .from('invoices')
        .select('count, sum(total), sum(amount_paid), sum(amount_due)')
        .eq('company_id', companyId)
        .single();

      if (aggregatedError) throw aggregatedError;

      // Fetch recent invoices
      const { data: recentInvoicesData, error: recentError } = await supabase
        .from('invoices')
        .select('*, clients(*)')
        .eq('company_id', companyId)
        .order('issue_date', { ascending: false })
        .limit(5);

      if (recentError) throw recentError;

      // Fetch overdue invoices
      const { data: overdueInvoicesData, error: overdueError } = await supabase
        .from('invoices')
        .select('*, clients(*)')
        .eq('company_id', companyId)
        .neq('status', 'paid') // Not paid
        .lt('due_date', new Date().toISOString().split('T')[0]) // Due date is in the past
        .order('due_date', { ascending: true })
        .limit(5);

      if (overdueError) throw overdueError;

      setDashboardData({
        totalInvoices: aggregatedData?.count || 0,
        totalRevenue: new Decimal(fromSmallestUnit(aggregatedData?.sum?.total || 0)),
        totalOutstanding: new Decimal(fromSmallestUnit(aggregatedData?.sum?.amount_due || 0)),
        totalPaidAmount: new Decimal(fromSmallestUnit(aggregatedData?.sum?.amount_paid || 0)),
        currency: companyCurrency,
        recentInvoices: recentInvoicesData || [],
        overdueInvoices: overdueInvoicesData || [],
      });

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      toast.error(error.message || 'Failed to fetch dashboard data.');
    } finally {
      setLoadingDashboard(false);
    }
  }, [company]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (!companySettingsLoading && company) {
      fetchDashboardData();
    } else if (!companySettingsLoading && companySettingsError) {
      toast.error(companySettingsError);
      setLoadingDashboard(false);
    }
  }, [user, authLoading, company, companySettingsLoading, companySettingsError, navigate, fetchDashboardData]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Signed out successfully!');
    }
  };

  if (authLoading || companySettingsLoading || loadingDashboard) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (companySettingsError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
        <h2 className="text-xl font-semibold text-red-600 mb-4">Error: {companySettingsError}</h2>
        <p className="text-muted-foreground mb-4">Please ensure your company is set up correctly in settings.</p>
        <Button onClick={() => navigate('/setup-company')}>Go to Company Setup</Button>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to auth page
  }

  return (
    <div className="flex flex-col min-h-screen bg-background p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Welcome, {company?.name || user.email}!</h1>
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

      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <Link to="/invoices">
            <Button size="lg">
              <PlusCircle className="mr-2 h-5 w-5" /> Create New Invoice
            </Button>
          </Link>
          <Link to="/clients">
            <Button size="lg" variant="outline">
              <Users className="mr-2 h-5 w-5" /> Add New Client
            </Button>
          </Link>
          <Link to="/products">
            <Button size="lg" variant="outline">
              <Package className="mr-2 h-5 w-5" /> Add New Product
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" /> Recent Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardData.recentInvoices.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No recent invoices found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboardData.recentInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        <Link to={`/invoices/${invoice.id}`} className="hover:underline">
                          {invoice.number || 'N/A'}
                        </Link>
                      </TableCell>
                      <TableCell>{invoice.clients?.name || 'Unknown Client'}</TableCell>
                      <TableCell>{format(new Date(invoice.due_date), 'PPP')}</TableCell>
                      <TableCell className="text-right">{formatCurrency(invoice.total, invoice.currency)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5 text-red-500" /> Overdue Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardData.overdueInvoices.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No overdue invoices!</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Amount Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboardData.overdueInvoices.map((invoice) => (
                    <TableRow key={invoice.id} className="bg-red-50/50">
                      <TableCell className="font-medium">
                        <Link to={`/invoices/${invoice.id}`} className="hover:underline text-red-700">
                          {invoice.number || 'N/A'}
                        </Link>
                      </TableCell>
                      <TableCell>{invoice.clients?.name || 'Unknown Client'}</TableCell>
                      <TableCell className="text-red-600">{format(new Date(invoice.due_date), 'PPP')}</TableCell>
                      <TableCell className="text-right text-red-600 font-semibold">{formatCurrency(invoice.amount_due, invoice.currency)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;