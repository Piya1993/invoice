"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Tables } from '@/types/supabase';
import { toast } from 'react-hot-toast';
import InvoiceForm from '@/components/InvoiceForm'; // Import the new form
import { useAuth } from '@/context/AuthContext';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';

// Extend Invoice type to include related client and invoice_items
type InvoiceWithDetails = Tables<'invoices'> & {
  clients: Tables<'clients'>;
  invoice_items: Tables<'invoice_items'>[];
};

const InvoicesPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceWithDetails | null>(null);

  const fetchInvoices = useCallback(async () => {
    if (!user?.id) return;

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
        .select('*, clients(*), invoice_items(*)') // Fetch related client and items
        .eq('company_id', companyData.id)
        .order('issue_date', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
      toast.error(error.message || 'Failed to fetch invoices.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchInvoices();
    }
  }, [user, authLoading, fetchInvoices]);

  const handleSaveInvoice = (newInvoice: InvoiceWithDetails) => {
    if (editingInvoice) {
      setInvoices(invoices.map((invoice) => (invoice.id === newInvoice.id ? newInvoice : invoice)));
    } else {
      setInvoices([newInvoice, ...invoices]); // Add new invoice to the top
    }
    setEditingInvoice(null);
    setIsFormOpen(false);
  };

  const handleEditInvoice = (invoice: InvoiceWithDetails) => {
    setEditingInvoice(invoice);
    setIsFormOpen(true);
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!window.confirm('Are you sure you want to delete this invoice? This will also delete all associated items and payments.')) return;

    const originalInvoices = [...invoices];
    setInvoices(invoices.filter((invoice) => invoice.id !== invoiceId)); // Optimistic UI

    try {
      // Supabase RLS should handle cascading deletes if set up, otherwise delete items first
      // For now, assuming RLS or database foreign key constraints handle invoice_items and payments
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId);

      if (error) throw error;
      toast.success('Invoice deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting invoice:', error);
      toast.error(error.message || 'Failed to delete invoice.');
      setInvoices(originalInvoices); // Revert on error
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p>Loading invoices...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Invoices</h1>
        <Button onClick={() => { setEditingInvoice(null); setIsFormOpen(true); }}>
          <PlusCircle className="mr-2 h-4 w-4" /> Create New Invoice
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No invoices found. Create your first invoice!</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.number || 'N/A'}</TableCell>
                    <TableCell>{invoice.clients?.name || 'Unknown Client'}</TableCell>
                    <TableCell>{format(new Date(invoice.issue_date), 'PPP')}</TableCell>
                    <TableCell>{format(new Date(invoice.due_date), 'PPP')}</TableCell>
                    <TableCell>{formatCurrency(invoice.total, invoice.currency)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                        invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                        invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEditInvoice(invoice)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteInvoice(invoice.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <InvoiceForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveInvoice}
        initialData={editingInvoice}
      />
    </div>
  );
};

export default InvoicesPage;