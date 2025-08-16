"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Tables, TablesInsert } from '@/types/supabase';
import { formatCurrency, fromSmallestUnit } from '@/lib/utils';
import Decimal from 'decimal.js';

// Define a type for an invoice item in the form, including a temporary ID for new items
type FormInvoiceItem = TablesInsert<'invoice_items'> & { tempId: string };

interface InvoiceItemsTableProps {
  invoiceItems: FormInvoiceItem[];
  setInvoiceItems: React.Dispatch<React.SetStateAction<FormInvoiceItem[]>>;
  products: Tables<'products'>[];
  currency: string;
  defaultTaxRate: number;
  loading: boolean;
}

const InvoiceItemsTable: React.FC<InvoiceItemsTableProps> = ({
  invoiceItems,
  setInvoiceItems,
  products,
  currency,
  defaultTaxRate,
  loading,
}) => {

  const handleAddItem = () => {
    setInvoiceItems(prevItems => [
      ...prevItems,
      {
        tempId: Date.now().toString(), // Unique ID for new items
        title: '',
        qty: 1,
        unit_price: 0,
        tax_rate: defaultTaxRate,
        discount: 0,
        invoice_id: '', // Will be set on save
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
            };
          }
          if (field === 'qty' || field === 'tax_rate') {
            return { ...item, [field]: parseFloat(value) || 0 };
          }
          if (field === 'unit_price' || field === 'discount') {
            return { ...item, [field]: toSmallestUnit(value) };
          }
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  return (
    <div className="space-y-4">
      {invoiceItems.map((item, index) => {
        const qty = new Decimal(item.qty || 0);
        const unitPrice = new Decimal(item.unit_price || 0); // Already in smallest unit
        const taxRate = new Decimal(item.tax_rate || 0).dividedBy(100);
        const discount = new Decimal(item.discount || 0); // Already in smallest unit

        const lineTotalBeforeTax = qty.times(unitPrice);
        const lineTax = lineTotalBeforeTax.times(taxRate);
        const lineTotal = lineTotalBeforeTax.plus(lineTax).minus(discount);

        return (
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
        );
      })}
      <Button type="button" variant="outline" onClick={handleAddItem} disabled={loading}>
        <PlusCircle className="mr-2 h-4 w-4" /> Add Item
      </Button>
    </div>
  );
};

export default InvoiceItemsTable;