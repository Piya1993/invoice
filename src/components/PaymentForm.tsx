"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase/client';
import { TablesInsert, TablesUpdate, Tables } from '@/types/supabase';
import { cn, toSmallestUnit, fromSmallestUnit } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import Decimal from 'decimal.js';

interface PaymentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payment: Tables<'payments'>) => void;
  invoiceId: string;
  invoiceCurrency: string;
  invoiceAmountDue: number; // This is the amount due at the time the form is opened
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  isOpen,
  onClose,
  onSave,
  invoiceId,
  invoiceCurrency,
  invoiceAmountDue,
}) => {
  const [loading, setLoading] = useState(false);
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(new Date());
  const [method, setMethod] = useState('Cash'); // Default payment method
  const [amount, setAmount] = useState(fromSmallestUnit(invoiceAmountDue).toString());
  const [notes, setNotes] = useState('');

  const paymentMethods = ['Cash', 'Bank Transfer', 'Credit Card', 'Cheque', 'Other'];

  useEffect(() => {
    if (isOpen) {
      setPaymentDate(new Date());
      setMethod('Cash');
      setAmount(fromSmallestUnit(invoiceAmountDue).toString());
      setNotes('');
    }
  }, [isOpen, invoiceAmountDue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!paymentDate) {
      toast.error('Please select a payment date.');
      return;
    }
    if (!method) {
      toast.error('Please select a payment method.');
      return;
    }
    const paymentAmountInSmallestUnit = toSmallestUnit(amount);
    if (new Decimal(paymentAmountInSmallestUnit).lessThanOrEqualTo(0)) {
      toast.error('Payment amount must be greater than zero.');
      return;
    }

    setLoading(true);
    try {
      // First, record the payment
      const paymentData: TablesInsert<'payments'> = {
        invoice_id: invoiceId,
        date: paymentDate.toISOString().split('T')[0],
        method,
        amount: paymentAmountInSmallestUnit,
        notes: notes || null,
      };

      const { data: newPayment, error: paymentError } = await supabase
        .from('payments')
        .insert(paymentData)
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Now, fetch the current state of the invoice to update its totals and status
      const { data: currentInvoice, error: fetchInvoiceError } = await supabase
        .from('invoices')
        .select('total, amount_paid, due_date, status') // Fetch current status
        .eq('id', invoiceId)
        .single();

      if (fetchInvoiceError || !currentInvoice) {
        throw new Error('Could not fetch current invoice details to update totals.');
      }

      const newTotalPaid = new Decimal(currentInvoice.amount_paid).plus(new Decimal(paymentAmountInSmallestUnit));
      const newAmountDue = new Decimal(currentInvoice.total).minus(newTotalPaid);

      let newStatus: Tables<'invoices'>['status'];

      if (newAmountDue.lessThanOrEqualTo(0)) {
        newStatus = 'paid';
      } else if (new Date(currentInvoice.due_date) < new Date()) {
        newStatus = 'overdue';
      } else {
        // If not fully paid and not overdue, retain current status unless it was 'draft'
        // If it was 'draft' and a payment is made, it should become 'sent'
        newStatus = currentInvoice.status === 'draft' ? 'sent' : currentInvoice.status;
      }

      const { data: updatedInvoice, error: invoiceUpdateError } = await supabase
        .from('invoices')
        .update({
          amount_paid: newTotalPaid.toNumber(),
          amount_due: newAmountDue.toNumber(),
          status: newStatus,
        })
        .eq('id', invoiceId)
        .select()
        .single();

      if (invoiceUpdateError) {
        console.error('Error updating invoice after payment:', invoiceUpdateError);
        toast.error('Payment recorded, but failed to update invoice status.');
      } else {
        toast.success('Payment recorded successfully!');
      }

      onSave(newPayment); // Pass the new payment data back to the parent
      onClose();
    } catch (error: any) {
      console.error('Error recording payment:', error);
      toast.error(error.message || 'Failed to record payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="paymentDate">Payment Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !paymentDate && "text-muted-foreground"
                  )}
                  disabled={loading}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {paymentDate ? format(paymentDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={paymentDate}
                  onSelect={setPaymentDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="method">Payment Method</Label>
            <Select value={method} onValueChange={setMethod} disabled={loading}>
              <SelectTrigger id="method">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map(m => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="amount">Amount ({invoiceCurrency})</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              min="0.01"
              disabled={loading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              disabled={loading}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? 'Recording...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentForm;