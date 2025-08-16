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
  invoiceAmountDue: number;
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
    if (new Decimal(amount).lessThanOrEqualTo(0)) {
      toast.error('Payment amount must be greater than zero.');
      return;
    }

    setLoading(true);
    try {
      const paymentData: TablesInsert<'payments'> = {
        invoice_id: invoiceId,
        date: paymentDate.toISOString().split('T')[0],
        method,
        amount: toSmallestUnit(amount),
        notes: notes || null,
      };

      const { data, error } = await supabase
        .from('payments')
        .insert(paymentData)
        .select()
        .single();

      if (error) throw error;

      // Update the invoice's amount_paid and amount_due
      const { data: updatedInvoice, error: invoiceUpdateError } = await supabase
        .from('invoices')
        .update({
          amount_paid: new Decimal(invoiceAmountDue).minus(new Decimal(toSmallestUnit(amount))).isNegative()
            ? new Decimal(invoiceAmountDue).plus(new Decimal(toSmallestUnit(amount))).toNumber() // If overpaid, add to current paid
            : new Decimal(invoiceAmountDue).minus(new Decimal(toSmallestUnit(amount))).toNumber(), // Otherwise, subtract from due
          amount_due: new Decimal(invoiceAmountDue).minus(new Decimal(toSmallestUnit(amount))).isNegative()
            ? 0 // If overpaid, amount due becomes 0
            : new Decimal(invoiceAmountDue).minus(new Decimal(toSmallestUnit(amount))).toNumber(),
          status: new Decimal(invoiceAmountDue).minus(new Decimal(toSmallestUnit(amount))).isZero() || new Decimal(invoiceAmountDue).minus(new Decimal(toSmallestUnit(amount))).isNegative()
            ? 'paid'
            : 'sent', // Or 'overdue' if due date passed
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

      onSave(data); // Pass the new payment data back to the parent
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