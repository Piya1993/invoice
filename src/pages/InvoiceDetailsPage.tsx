"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/lib/supabase/client';
import { Tables } from '@/types/supabase';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency, fromSmallestUnit } from '@/lib/utils';
import { format } from 'date-fns';
import { ArrowLeft, Edit, Printer, DollarSign } from 'lucide-react';

// Extend Invoice type to include related client and invoice_items
type InvoiceWithDetails = Tables<'invoices'> & {
  clients: Tables<'clients'>;
  invoice_items: Tables<'invoice_items'>[];
  payments: Tables<'payments'>[]; // Add payments to the type
};

const InvoiceDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [invoice, setInvoice] = useState<InvoiceWithDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchInvoiceDetails = useCallback(async () => {
    if (!user?.id || !id) return;

    setLoading(true);
    try {
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .eq('created_by', user.id)
        .single();

      if (companyError || !companyData) {
        throw new Error('Could not find company for the current user. Please ensure your company is set up.');
      }

      const { data, error } = await supabase
        .from('invoices')
        .select('*, clients(*), invoice_items(*), payments(*)') // Fetch payments as well
        .eq('id', id)
        .eq('company_id', companyData.id) // Ensure invoice belongs to user's company
        .single();

      if (error) throw error;
      if (!data) {
        toast.error('Invoice not found or you do not have permission to view it.');
        router.push('/invoices');
        return;
      }
      setInvoice(data);
    } catch (error: any) {
      console.error('Error fetching invoice details:', error);
      toast.error(error.message || 'Failed to fetch invoice details.');
      router.push('/invoices'); // Redirect if error
    } finally {
      setLoading(false);
    }
  }, [user, id, router]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchInvoiceDetails();
    }
  }, [user, authLoading, fetchInvoiceDetails]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p>Loading invoice details...</p>
      </div>
    );
  }

  if (!invoice) {
    return null; // Redirect handled in fetchInvoiceDetails
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <Button variant="outline" onClick={() => router.push('/invoices')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Invoices
        </Button>
        <h1 className="text-3xl font-bold">Invoice #{invoice.number || invoice.id.substring(0, 8)}</h1>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => toast.info('Print functionality coming soon!')}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button onClick={() => toast.info('Edit functionality will open form.')}>
            <Edit className="mr-2 h-4 w-4" /> Edit Invoice
          </Button>
          <Button variant="secondary" onClick={() => toast.info('Record Payment functionality coming soon!')}>
            <DollarSign className="mr-2 h-4 w-4" /> Record Payment
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Invoice Overview</CardTitle>
          <CardDescription>Details for invoice #{invoice.number || invoice.id.substring(0, 8)}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p><strong>Client:</strong> {invoice.clients?.name || 'N/A'}</p>
            <p><strong>Client Email:</strong> {invoice.clients?.email || 'N/A'}</p>
            <p><strong>Client Phone:</strong> {invoice.clients?.phone || 'N/A'}</p>
            <p><strong>Client Address:</strong> {invoice.clients?.address || 'N/A'}</p>
          </div>
          <div>
            <p><strong>Issue Date:</strong> {format(new Date(invoice.issue_date), 'PPP')}</p>
            <p><strong>Due Date:</strong> {format(new Date(invoice.due_date), 'PPP')}</p>
            <p><strong>Status:</strong> <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
              </span>
            </p>
            <p><strong>Currency:</strong> {invoice.currency}</p>
          </div>
          <div className="col-span-full">
            <p><strong>Notes:</strong> {invoice.notes || 'N/A'}</p>
            <p><strong>Terms:</strong> {invoice.terms || 'N/A'}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Invoice Items</CardTitle>
        </CardHeader>
        <CardContent>
          {invoice.invoice_items.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No items for this invoice.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Tax Rate</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead className="text-right">Line Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.invoice_items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell>{item.qty}</TableCell>
                    <TableCell>{formatCurrency(item.unit_price, invoice.currency)}</TableCell>
                    <TableCell>{item.tax_rate}%</TableCell>
                    <TableCell>{formatCurrency(item.discount, invoice.currency)}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(
                        (fromSmallestUnit(item.qty * item.unit_price) * (1 + item.tax_rate / 100)) - fromSmallestUnit(item.discount),
                        invoice.currency
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <div className="flex justify-end mt-4 text-lg font-semibold">
            <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
              <span>Subtotal:</span>
              <span className="text-right">{formatCurrency(invoice.subtotal, invoice.currency)}</span>
              <span>Tax Total:</span>
              <span className="text-right">{formatCurrency(invoice.tax_total, invoice.currency)}</span>
              <span>Discount Total:</span>
              <span className="text-right">{formatCurrency(invoice.discount_total, invoice.currency)}</span>
              <Separator className="col-span-2 my-2" />
              <span className="text-xl font-bold">Total:</span>
              <span className="text-right text-xl font-bold">{formatCurrency(invoice.total, invoice.currency)}</span>
              <span className="text-muted-foreground">Amount Paid:</span>
              <span className="text-right text-muted-foreground">{formatCurrency(invoice.amount_paid, invoice.currency)}</span>
              <span className="text-xl font-bold text-primary">Amount Due:</span>
              <span className="text-right text-xl font-bold text-primary">{formatCurrency(invoice.amount_due, invoice.currency)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {invoice.payments.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No payments recorded for this invoice.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{format(new Date(payment.date), 'PPP')}</TableCell>
                    <TableCell>{payment.method}</TableCell>
                    <TableCell className="text-right">{formatCurrency(payment.amount, invoice.currency)}</TableCell>
                    <TableCell>{payment.notes || 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoiceDetailsPage;