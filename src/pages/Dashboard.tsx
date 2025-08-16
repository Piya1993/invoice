"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, fromSmallestUnit } from '@/lib/utils';
import Decimal from 'decimal.js';
import { DollarSign, FileText, TrendingUp, Wallet, Clock } from 'lucide-react';
import { Tables } from '@/types/supabase';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

// Extend Invoice type to include related client for display
type InvoiceWithClient = Tables<'invoices'> & {
  clients: Tables<'clients'>;
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
    recentInvoices: [] as InvoiceWithClient[],
    overdueInvoices: [] as InvoiceWithClient[],
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
        .select('*, clients(*)') // Fetch client details along with invoices
        .eq('company_id', companyId);

      if (invoicesError) throw invoicesError;

      let totalInvoices = invoicesData.length;
      let totalRevenue = new Decimal(0);
      let totalOutstanding = new Decimal(0);
      let totalPaidAmount = new Decimal(0);

      const recentInvoices: InvoiceWithClient[] = [];
      const overdueInvoices: InvoiceWithClient[] = [];
      const today = new Date();

      invoicesData.forEach(invoice => {
        totalRevenue = totalRevenue.plus(fromSmallestUnit(invoice.total));
        totalOutstanding = totalOutstanding.plus(fromSmallestUnit(invoice.amount_due));
        totalPaidAmount = totalPaidAmount.plus(fromSmallestUnit(invoice.amount_paid));

        // Check for overdue invoices
        if (invoice.status !== 'paid' && new Date(invoice.due_date) < today) {
          overdueInvoices.push(invoice);
        }
      });

      // Sort all invoices by issue_date descending to get recent ones
      const sortedInvoices = invoicesData.sort((a, b) => new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime());
      recentInvoices.push(...sortedInvoices.slice(0, 5)); // Get top 5 recent invoices

      setDashboardData({
        totalInvoices,
        totalRevenue,
        totalOutstanding,
        totalPaidAmount,
        currency: companyCurrency,
        recentInvoices,
        overdueInvoices,
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