"use client";

import React, { useState, useEffect, useCallback } from 'react';
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
import { TablesInsert, TablesUpdate, Tables, Enums } from '@/types/supabase';
import { useAuth } from '@/context/AuthContext';
import { toSmallestUnit, fromSmallestUnit, formatCurrency, cn } from '@/lib/utils';
import { CalendarIcon, PlusCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import Decimal from 'decimal.js';

// Define a type for an invoice item in the form, including a temporary ID for new items
type FormInvoiceItem = TablesInsert<'invoice_items'> & { tempId: string };

interface InvoiceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (invoice: Tables<'invoices'> & { invoice_items: Tables<'invoice_items'>[] }) => void;
  initialData?: (Tables<'invoices'> & { invoice_items: Tables<'invoice_items'>[] }) | null;
  companyId: string; // New prop
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({ isOpen, onClose, onSave, initialData, companyId }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Tables<'clients'>[]>([]);
  const [products, setProducts] = useState<Tables<'products'>[]>([]);
  const [companySettings, setCompanySettings] = useState<Tables<'settings'> | null>(null);

  const [invoiceNumber, setInvoiceNumber] = useState(initialData?.number || '');
  const [clientId, setClientId] = useState(initialData?.client_id || '');
  const [issueDate, setIssueDate] = useState<Date | undefined>(initialData?.issue_date ? new Date(initialData.issue_date) : new Date());
  const [dueDate, setDueDate] = useState<Date | undefined>(initialData?.due_date ? new Date(initialData.due_date) : new Date());
  const [status, setStatus] = useState<Enums<'invoice_status'>>(initialData?.status || 'draft');
  const [currency, setCurrency] = useState(initialData?.currency || 'PKR'); // Default currency
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');
  const [invoiceItems, setInvoiceItems] = useState<FormInvoiceItem[]>([]);

  // Calculated totals (stored in smallest unit)
  const [subtotal, setSubtotal] = useState(0);
  const [taxTotal, setTaxTotal] = useState(0);
  const [discountTotal, setDiscountTotal] = useState(0);
  const [total, setTotal] = useState(0);

  const invoiceStatuses: Enums<'invoice_status'>[] = ['draft', 'sent', 'paid', 'overdue', 'void'];

  const fetchClientsProductsAndSettings = useCallback(async () => {
    if (!user?.id || !companyId) return; // Ensure companyId is available

    setLoading(true);
    try {
      // Fetch company currency and settings
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id, currency')
        .eq('id', companyId) // Use companyId prop
        .single();

      if (companyError || !companyData) {
        throw new Error('Could not find company details. Please ensure your company is set up.');
      }

      setCurrency(companyData.currency); // Set default currency from company settings

      const { data: settingsData, error: settingsError } = await supabase
        .from('settings')
        .select('*')
        .eq('company_id', companyId) // Use companyId prop
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') { // PGRST116 means no rows found
        throw settingsError;
      }
      setCompanySettings(settingsData);

      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('company_id', companyId) // Use companyId prop
        .order('name', { ascending: true });

      if (clientsError) throw clientsError;
      setClients(clientsData || []);

      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', companyId) // Use companyId prop
        .order('name', { ascending: true });

      if (productsError) throw productsError;
      setProducts(productsData || []);

    } catch (error: any) {
      console.error('Error fetching clients/products/settings:', error);
      toast.error(error.message || 'Failed to load clients, products, or settings.');
    } finally {
      setLoading(false);
    }
  }, [user, companyId]); // Add companyId to dependencies

  useEffect(() => {
    if (isOpen) {
      fetchClientsProductsAndSettings();
      if (initialData) {
        setInvoiceNumber(initialData.number || '');
        setClientId(initialData.client_id);
        setIssueDate(initialData.issue_date ? new Date(initialData.issue_date) : undefined);
        setDueDate(initialData.due_date ? new Date(initialData.due_date) : undefined);
        setStatus(initialData.status);
        setCurrency(initialData.currency);
        setNotes(initialData.notes || '');
        setTerms(initialData.terms || '');
        setInvoiceItems(initialData.invoice_items.map(item => ({ ...item, tempId: item.id })));
      } else {
        // Reset form for new invoice
        setInvoiceNumber(''); // Will be set by useEffect below
        setClientId('');
        setIssueDate(new Date());
        setDueDate(new Date());
        setStatus('draft');
        setNotes('');
        setTerms('');
        // Initial item will be set once companySettings are loaded
        setInvoiceItems([]);
      }
    }
  }, [isOpen, initialData, fetchClientsProductsAndSettings]);


  // Effect to set initial invoice number and first item for new invoices
  useEffect(() => {
    if (isOpen && !initialData && companySettings) {
      const nextNum = companySettings.next_number.toString().padStart(3, '0'); // e.g., 1 -> "001"
      setInvoiceNumber(`${companySettings.numbering_prefix}${nextNum}`);
      // Add initial item with default tax rate
      setInvoiceItems([{
        tempId: Date.now().toString(), // Unique ID for new items
        title: '',
        qty: 1,
        unit_price: 0,
        tax_rate: companySettings.default_tax_rate || 0, // Set default tax rate for new item
        discount: 0,
        invoice_id: '', // Will be set on save
        product_id: null,
      }]);
    }
  }, [isOpen, initialData, companySettings]);


  const calculateTotals = useCallback(() => {
    let currentSubtotal = new Decimal(0);
    let currentTaxTotal = new Decimal(0);
    let currentDiscountTotal = new Decimal(0);

    invoiceItems.forEach(item => {
      const qty = new Decimal(item.qty || 0);
      const unitPriceInSmallestUnit = new Decimal(item.unit_price || 0); // Keep in smallest unit
      const taxRate = new Decimal(item.tax_rate || 0).dividedBy(100); // Convert percentage to decimal
      const discountInSmallestUnit = new Decimal(item.discount || 0); // Keep in smallest unit

      const lineTotalBeforeTaxInSmallestUnit = qty.times(unitPriceInSmallestUnit);
      const lineTaxInSmallestUnit = lineTotalBeforeTaxInSmallestUnit.times(taxRate);
      const lineDiscountInSmallestUnit = discountInSmallestUnit;

      currentSubtotal = currentSubtotal.plus(lineTotalBeforeTaxInSmallestUnit);
      currentTaxTotal = currentTaxTotal.plus(lineTaxInSmallestUnit);
      currentDiscountTotal = currentDiscountTotal.plus(lineDiscountInSmallestUnit);
    });

    const currentTotal = currentSubtotal.plus(currentTaxTotal).minus(currentDiscountTotal);

    // Store results as numbers (which Decimal.js can convert to)
    setSubtotal(currentSubtotal.toNumber());
    setTaxTotal(currentTaxTotal.toNumber());
    setDiscountTotal(currentDiscountTotal.toNumber());
    setTotal(currentTotal.toNumber());
  }, [invoiceItems]);

  useEffect(() => {
    calculateTotals();
  }, [invoiceItems, calculateTotals]);

  const handleAddItem = () => {
    setInvoiceItems(prevItems => [
      ...prevItems,
      {
        tempId: Date.now().toString(),
        title: '',
        qty: 1,
        unit_price: 0,
        tax_rate: companySettings?.default_tax_rate || 0, // Set default tax rate for new item
        discount: 0,
        invoice_id: '',
        product_id: null,
      },
    ]);
  };

  const handleRemoveItem = (tempId: string) => {
    setInvoiceItems(prevItems => prevItems.filter(item => item.tempId !== tempId));
  };

  const handleItemChange = (tempId: string, field: keyof FormInvoiceItem, value: any) => {
    setInvoiceItems(prevItems =>
      prevItems.map(item => {
        if (item.tempId === tempId) {
          if (field === 'product_id') {
            const selectedProduct = products.find(p => p.id === value);
            return {
              ...item,
              product_id: value,
              title: selectedProduct?.name || '',
              unit_price: selectedProduct?.default_price || 0,
              // Do NOT reset qty, tax_rate, or discount when product changes
              // These should be manually adjustable by the user
            };
          }
          if (field === 'qty' || field === 'tax_rate') {
            // These are numbers directly
            return { ...item, [field]: parseFloat(value) || 0 };
          }
          if (field === 'unit_price' || field === 'discount') {
            // Convert to smallest unit for storage
            return { ...item, [field]: toSmallestUnit(value) };
          }
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      toast.error('User not authenticated.');
      return;
    }
    if (!companyId) {
      toast.error('Company ID is missing. Please ensure your company is set up.');
      return;
    }
    if (!clientId) {
      toast.error('Please select a client.');
      return;
    }
    if (!issueDate || !dueDate) {
      toast.error('Please select both issue and due dates.');
      return;
    }
    if (invoiceItems.length === 0) {
      toast.error('Please add at least one invoice item.');
      return;
    }
    if (invoiceItems.some(item => !item.title || item.qty <= 0 || item.unit_price <= 0)) {
      toast.error('Please ensure all invoice items have a title, quantity greater than 0, and unit price greater than 0.');
      return;
    }

    setLoading(true);
    try {
      const invoiceData: TablesInsert<'invoices'> = {
        client_id: clientId,
        issue_date: issueDate.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        status,
        currency,
        notes: notes || null,
        terms: terms || null,
        number: invoiceNumber || null,
        subtotal,
        tax_total: taxTotal,
        discount_total: discountTotal,
        total,
        amount_paid: initialData?.amount_paid || 0, // Keep existing amount paid for updates
        amount_due: total - (initialData?.amount_paid || 0), // Recalculate amount due
        company_id: companyId, // Use the prop
      };

      let savedInvoice: Tables<'invoices'>;
      let savedInvoiceItems: Tables<'invoice_items'>[] = [];

      if (initialData?.id) {
        // Update existing invoice
        const { data, error } = await supabase
          .from('invoices')
          .update(invoiceData as TablesUpdate<'invoices'>)
          .eq('id', initialData.id)
          .select()
          .single();

        if (error) throw error;
        savedInvoice = data;

        // Handle invoice items: delete old, insert new, update existing
        const existingItemIds = new Set(initialData.invoice_items.map(item => item.id));
        const currentItemIds = new Set(invoiceItems.map(item => item.id).filter(Boolean));

        // Items to delete
        const itemsToDelete = initialData.invoice_items.filter(item => !currentItemIds.has(item.id));
        if (itemsToDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from('invoice_items')
            .delete()
            .in('id', itemsToDelete.map(item => item.id));
          if (deleteError) throw deleteError;
        }

        // Items to insert/update
        for (const item of invoiceItems) {
          const itemToSave: TablesInsert<'invoice_items'> = {
            invoice_id: savedInvoice.id,
            title: item.title,
            qty: item.qty,
            unit_price: item.unit_price,
            tax_rate: item.tax_rate,
            discount: item.discount,
            product_id: item.product_id,
          };

          if (item.id && existingItemIds.has(item.id)) {
            // Update existing item
            const { data: updatedItem, error: updateItemError } = await supabase
              .from('invoice_items')
              .update(itemToSave as TablesUpdate<'invoice_items'>)
              .eq('id', item.id)
              .select()
              .single();
            if (updateItemError) throw updateItemError;
            savedInvoiceItems.push(updatedItem);
          } else {
            // Insert new item
            const { data: newItem, error: insertItemError } = await supabase
              .from('invoice_items')
              .insert(itemToSave)
              .select()
              .single();
            if (insertItemError) throw insertItemError;
            savedInvoiceItems.push(newItem);
          }
        }

      } else {
        // Create new invoice
        const { data: newInvoice, error } = await supabase
          .from('invoices')
          .insert(invoiceData)
          .select()
          .single();

        if (error) throw error;
        savedInvoice = newInvoice;

        // Insert invoice items
        const itemsToInsert = invoiceItems.map(item => ({
          ...item,
          invoice_id: savedInvoice.id,
          id: undefined, // Ensure new items don't have an ID
        }));

        const { data: newItems, error: itemsError } = await supabase
          .from('invoice_items')
          .insert(itemsToInsert)
          .select();

        if (itemsError) throw itemsError;
        savedInvoiceItems = newItems;

        // Increment next_number in settings
        if (companySettings) {
          const { error: updateSettingsError } = await supabase
            .from('settings')
            .update({ next_number: companySettings.next_number + 1 })
            .eq('company_id', companySettings.company_id);
          if (updateSettingsError) {
            console.error('Error incrementing next_number:', updateSettingsError);
            toast.error('Failed to update next invoice number in settings.');
          }
        }
      }

      onSave({ ...savedInvoice, invoice_items: savedInvoiceItems });
      toast.success(`Invoice ${initialData ? 'updated' : 'added'} successfully!`);
      onClose();
    } catch (error: any) {
      console.error('Error saving invoice:', error);
      toast.error(error.message || 'Failed to save invoice.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Invoice' : 'Create New Invoice'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="client">Client</Label>
              <Select value={clientId} onValueChange={setClientId} disabled={loading}>
                <SelectTrigger id="client">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invoiceNumber">Invoice Number (Optional)</Label>
              <Input
                id="invoiceNumber"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                disabled={loading || (companySettings && !initialData)} // Disable if auto-generated for new invoices
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="issueDate">Issue Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !issueDate && "text-muted-foreground"
                    )}
                    disabled={loading}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {issueDate ? format(issueDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={issueDate}
                    onSelect={setIssueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                    disabled={loading}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus} disabled={loading}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {invoiceStatuses.map(s => (
                  <SelectItem key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <h3 className="text-lg font-semibold mt-4">Invoice Items</h3>
          <div className="space-y-4">
            {invoiceItems.map((item, index) => (
              <div key={item.tempId} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end border p-4 rounded-md">
                <div className="col-span-full md:col-span-2 grid gap-2">
                  <Label htmlFor={`item-product-${item.tempId}`}>Product/Service</Label>
                  <Select
                    value={item.product_id || ''}
                    onValueChange={(value) => handleItemChange(item.tempId, 'product_id', value)}
                    disabled={loading}
                  >
                    <SelectTrigger id={`item-product-${item.tempId}`}>
                      <SelectValue placeholder="Select a product (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(product => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} ({formatCurrency(product.default_price, currency)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-full md:col-span-2 grid gap-2">
                  <Label htmlFor={`item-title-${item.tempId}`}>Title</Label>
                  <Input
                    id={`item-title-${item.tempId}`}
                    value={item.title}
                    onChange={(e) => handleItemChange(item.tempId, 'title', e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`item-qty-${item.tempId}`}>Qty</Label>
                  <Input
                    id={`item-qty-${item.tempId}`}
                    type="number"
                    value={item.qty}
                    onChange={(e) => handleItemChange(item.tempId, 'qty', e.target.value)}
                    min="1"
                    required
                    disabled={loading}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`item-unit-price-${item.tempId}`}>Unit Price ({currency})</Label>
                  <Input
                    id={`item-unit-price-${item.tempId}`}
                    type="number"
                    step="0.01"
                    value={fromSmallestUnit(item.unit_price)}
                    onChange={(e) => handleItemChange(item.tempId, 'unit_price', e.target.value)}
                    min="0"
                    required
                    disabled={loading}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`item-tax-rate-${item.tempId}`}>Tax Rate (%)</Label>
                  <Input
                    id={`item-tax-rate-${item.tempId}`}
                    type="number"
                    step="0.01"
                    value={item.tax_rate}
                    onChange={(e) => handleItemChange(item.tempId, 'tax_rate', e.target.value)}
                    min="0"
                    max="100"
                    disabled={loading}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`item-discount-${item.tempId}`}>Discount ({currency})</Label>
                  <Input
                    id={`item-discount-${item.tempId}`}
                    type="number"
                    step="0.01"
                    value={fromSmallestUnit(item.discount)}
                    onChange={(e) => handleItemChange(item.tempId, 'discount', e.target.value)}
                    min="0"
                    disabled={loading}
                  />
                </div>
                <div className="col-span-full flex justify-end">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveItem(item.tempId)}
                    disabled={loading || invoiceItems.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={handleAddItem} disabled={loading}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Item
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="terms">Terms & Conditions</Label>
              <Textarea
                id="terms"
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                rows={3}
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="grid gap-2">
              <Label>Subtotal</Label>
              <Input value={formatCurrency(subtotal, currency)} readOnly className="font-semibold" />
            </div>
            <div className="grid gap-2">
              <Label>Tax Total</Label>
              <Input value={formatCurrency(taxTotal, currency)} readOnly className="font-semibold" />
            </div>
            <div className="grid gap-2">
              <Label>Discount Total</Label>
              <Input value={formatCurrency(discountTotal, currency)} readOnly className="font-semibold" />
            </div>
            <div className="grid gap-2">
              <Label>Total</Label>
              <Input value={formatCurrency(total, currency)} readOnly className="font-bold text-xl" />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Invoice'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceForm;