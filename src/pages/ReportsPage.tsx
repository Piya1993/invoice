"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/lib/supabase/client';
import { Tables } from '@/types/supabase';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency, fromSmallestUnit } from '@/lib/utils';
import Decimal from 'decimal.js';
import { subDays } from 'date-fns';

// Extend Invoice type to include related client and invoice_items for calculations
type InvoiceWithDetails = Tables<'invoices'> & {
  clients: Tables<'clients'>;
  invoice_items: Tables<'invoice_items'>[];
};

const ReportsPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState({
    totalInvoices: 0,
    paidInvoices: 0,
    sentInvoices: 0,
    overdueInvoices: 0,
    draftInvoices: 0,
    voidInvoices: 0,
    totalRevenue: new Decimal(0),
    totalOutstanding: new Decimal(0),
    totalPaidAmount: new Decimal(0),
    totalClients: 0,
    newClientsLast30Days: 0,
    topClientName: 'N/A',
    topClientRevenue: new Decimal(0),
    totalProducts: 0,
    bestSellingProductName: 'N/A',
    bestSellingProductRevenue: new Decimal(0),
    totalProductRevenue: new Decimal(0),
  });
  const [displayCurrency, setDisplayCurrency] = useState('PKR'); // State to hold the actual currency

  const fetchReportData = useCallback(async () => {
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
      setDisplayCurrency(companyData.currency || 'PKR'); // Set the display currency

      // Fetch all invoices with items and clients
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*, clients(*), invoice_items(*)')
        .eq('company_id', companyId);

      if (invoicesError) throw invoicesError;

      // Fetch all clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('company_id', companyId);

      if (clientsError) throw clientsError;

      // Fetch all products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', companyId);

      if (productsError) throw productsError;

      // --- Calculate Invoice Summary ---
      let totalInvoices = invoicesData.length;
      let paidInvoices = 0;
      let sentInvoices = 0;
      let overdueInvoices = 0;
      let draftInvoices = 0;
      let voidInvoices = 0;
      let totalRevenue = new Decimal(0); // Sum of invoice.total
      let totalOutstanding = new Decimal(0); // Sum of invoice.amount_due
      let totalPaidAmount = new Decimal(0); // Sum of invoice.amount_paid

      const clientRevenueMap = new Map<string, Decimal>(); // client_id -> total revenue from this client
      const productRevenueMap = new Map<string, Decimal>(); // product_id -> total revenue from this product

      invoicesData.forEach((invoice: InvoiceWithDetails) => {
        switch (invoice.status) {
          case 'paid': paidInvoices++; break;
          case 'sent': sentInvoices++; break;
          case 'overdue': overdueInvoices++; break;
          case 'draft': draftInvoices++; break;
          case 'void': voidInvoices++; break;
        }
        totalRevenue = totalRevenue.plus(fromSmallestUnit(invoice.total));
        totalOutstanding = totalOutstanding.plus(fromSmallestUnit(invoice.amount_due));
        totalPaidAmount = totalPaidAmount.plus(fromSmallestUnit(invoice.amount_paid));

        // For Client Activity
        if (invoice.client_id) {
          const currentClientRevenue = clientRevenueMap.get(invoice.client_id) || new Decimal(0);
          clientRevenueMap.set(invoice.client_id, currentClientRevenue.plus(fromSmallestUnit(invoice.total)));
        }

        // For Product Performance
        invoice.invoice_items.forEach(item => {
          if (item.product_id) {
            const itemLineTotal = new Decimal(fromSmallestUnit(item.qty * item.unit_price))
              .times(new Decimal(1).plus(new Decimal(item.tax_rate || 0).dividedBy(100)))
              .minus(fromSmallestUnit(item.discount || 0));
            const currentProductRevenue = productRevenueMap.get(item.product_id) || new Decimal(0);
            productRevenueMap.set(item.product_id, currentProductRevenue.plus(itemLineTotal));
          }
        });
      });

      // --- Calculate Client Activity ---
      let totalClients = clientsData.length;
      const thirtyDaysAgo = subDays(new Date(), 30);
      let newClientsLast30Days = clientsData.filter(client => new Date(client.created_at) >= thirtyDaysAgo).length;

      let topClientName = 'N/A';
      let topClientRevenue = new Decimal(0);
      if (clientRevenueMap.size > 0) {
        const sortedClients = Array.from(clientRevenueMap.entries()).sort((a, b) => b[1].minus(a[1]).toNumber());
        const topClientId = sortedClients[0][0];
        topClientRevenue = sortedClients[0][1];
        topClientName = clientsData.find(c => c.id === topClientId)?.name || 'Unknown Client';
      }

      // --- Calculate Product Performance ---
      let totalProducts = productsData.length;
      let bestSellingProductName = 'N/A';
      let bestSellingProductRevenue = new Decimal(0);
      let totalProductRevenue = new Decimal(0); // Sum of all product revenues

      if (productRevenueMap.size > 0) {
        const sortedProducts = Array.from(productRevenueMap.entries()).sort((a, b) => b[1].minus(a[1]).toNumber());
        const bestSellingProductId = sortedProducts[0][0];
        bestSellingProductRevenue = sortedProducts[0][1];
        bestSellingProductName = productsData.find(p => p.id === bestSellingProductId)?.name || 'Unknown Product';

        totalProductRevenue = Array.from(productRevenueMap.values()).reduce((sum, current) => sum.plus(current), new Decimal(0));
      }


      setReportData({
        totalInvoices,
        paidInvoices,
        sentInvoices,
        overdueInvoices,
        draftInvoices,
        voidInvoices,
        totalRevenue,
        totalOutstanding,
        totalPaidAmount,
        totalClients,
        newClientsLast30Days,
        topClientName,
        topClientRevenue,
        totalProducts,
        bestSellingProductName,
        bestSellingProductRevenue,
        totalProductRevenue,
      });

    } catch (error: any) {
      console.error('Error fetching reports:', error);
      toast.error(error.message || 'Failed to fetch report data.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchReportData();
    }
  }, [user, authLoading, fetchReportData]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p>Loading reports...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Reports & Analytics</h1>
      <p className="text-muted-foreground mb-8">
        Gain insights into your business with detailed reports.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Invoice Summary</CardTitle>
            <CardDescription>Overview of your invoices by status and total amounts.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>Total Invoices: <span className="font-semibold">{reportData.totalInvoices}</span></p>
              <p>Paid Invoices: <span className="font-semibold">{reportData.paidInvoices}</span></p>
              <p>Sent Invoices: <span className="font-semibold">{reportData.sentInvoices}</span></p>
              <p>Overdue Invoices: <span className="font-semibold">{reportData.overdueInvoices}</span></p>
              <p>Draft Invoices: <span className="font-semibold">{reportData.draftInvoices}</span></p>
              <p>Void Invoices: <span className="font-semibold">{reportData.voidInvoices}</span></p>
              <Separator className="my-2" />
              <p>Total Revenue: <span className="font-semibold">{formatCurrency(reportData.totalRevenue, displayCurrency)}</span></p>
              <p>Total Paid Amount: <span className="font-semibold">{formatCurrency(reportData.totalPaidAmount, displayCurrency)}</span></p>
              <p>Total Outstanding: <span className="font-semibold">{formatCurrency(reportData.totalOutstanding, displayCurrency)}</span></p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Client Activity</CardTitle>
            <CardDescription>Track invoice activity and spending per client.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>Total Clients: <span className="font-semibold">{reportData.totalClients}</span></p>
              <p>New Clients (last 30 days): <span className="font-semibold">{reportData.newClientsLast30Days}</span></p>
              <Separator className="my-2" />
              <p>Top Client (by revenue): <span className="font-semibold">{reportData.topClientName}</span></p>
              <p>Revenue from Top Client: <span className="font-semibold">{formatCurrency(reportData.topClientRevenue, displayCurrency)}</span></p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Product/Service Performance</CardTitle>
            <CardDescription>Analyze which products or services are most popular.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>Total Products: <span className="font-semibold">{reportData.totalProducts}</span></p>
              <p>Best Selling Product: <span className="font-semibold">{reportData.bestSellingProductName}</span></p>
              <p>Revenue from Best Seller: <span className="font-semibold">{formatCurrency(reportData.bestSellingProductRevenue, displayCurrency)}</span></p>
              <Separator className="my-2" />
              <p>Total Product Revenue: <span className="font-semibold">{formatCurrency(reportData.totalProductRevenue, displayCurrency)}</span></p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 text-center text-muted-foreground">
        <p>More detailed reports and customization options coming soon!</p>
      </div>
    </div>
  );
};

export default ReportsPage;