"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/types/supabase';
import { useAuth } from '@/context/AuthContext';

interface SettingsFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (company: Tables<'companies'>, settings: Tables<'settings'>) => void;
  initialCompanyData?: Tables<'companies'> | null;
  initialSettingsData?: Tables<'settings'> | null;
  isInitialSetup?: boolean; // New prop
}

const SettingsForm: React.FC<SettingsFormProps> = ({
  isOpen,
  onClose,
  onSave,
  initialCompanyData,
  initialSettingsData,
  isInitialSetup = false, // Default to false
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Company fields
  const [companyName, setCompanyName] = useState(initialCompanyData?.name || '');
  const [companyLogoUrl, setCompanyLogoUrl] = useState(initialCompanyData?.logo_url || '');
  const [companyAddress, setCompanyAddress] = useState(initialCompanyData?.address || '');
  const [companyPhone, setCompanyPhone] = useState(initialCompanyData?.phone || '');
  const [companyEmail, setCompanyEmail] = useState(initialCompanyData?.email || '');
  const [companyTaxId, setCompanyTaxId] = useState(initialCompanyData?.tax_id || '');
  const [companyCurrency, setCompanyCurrency] = useState(initialCompanyData?.currency || 'PKR');

  // Settings fields
  const [defaultTaxRate, setDefaultTaxRate] = useState(initialSettingsData?.default_tax_rate?.toString() || '0');
  const [numberingPrefix, setNumberingPrefix] = useState(initialSettingsData?.numbering_prefix || 'INV-');
  const [nextNumber, setNextNumber] = useState(initialSettingsData?.next_number?.toString() || '1');
  const [locale, setLocale] = useState(initialSettingsData?.locale || 'en-PK');
  const [timezone, setTimezone] = useState(initialSettingsData?.timezone || 'Asia/Karachi');

  const commonCurrencies = ['PKR', 'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SEK', 'NZD'];


  useEffect(() => {
    if (isOpen) {
      setCompanyName(initialCompanyData?.name || '');
      setCompanyLogoUrl(initialCompanyData?.logo_url || '');
      setCompanyAddress(initialCompanyData?.address || '');
      setCompanyPhone(initialCompanyData?.phone || '');
      setCompanyEmail(initialCompanyData?.email || '');
      setCompanyTaxId(initialCompanyData?.tax_id || '');
      setCompanyCurrency(initialCompanyData?.currency || 'PKR');

      setDefaultTaxRate(initialSettingsData?.default_tax_rate?.toString() || '0');
      setNumberingPrefix(initialSettingsData?.numbering_prefix || 'INV-');
      setNextNumber(initialSettingsData?.next_number?.toString() || '1');
      setLocale(initialSettingsData?.locale || 'en-PK');
      setTimezone(initialSettingsData?.timezone || 'Asia/Karachi');
    }
  }, [isOpen, initialCompanyData, initialSettingsData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      toast.error('User not authenticated.');
      return;
    }
    if (!companyName.trim()) {
      toast.error('Company Name is required.');
      return;
    }

    setLoading(true);
    try {
      let currentCompanyId: string;
      let savedCompany: Tables<'companies'>;

      if (initialCompanyData?.id) {
        // Update existing company
        const companyUpdate: TablesUpdate<'companies'> = {
          name: companyName,
          logo_url: companyLogoUrl || null,
          address: companyAddress || null,
          phone: companyPhone || null,
          email: companyEmail || null,
          tax_id: companyTaxId || null,
          currency: companyCurrency,
        };
        const { data, error } = await supabase
          .from('companies')
          .update(companyUpdate)
          .eq('id', initialCompanyData.id)
          .select()
          .single();
        if (error) throw error;
        savedCompany = data;
        currentCompanyId = data.id;
      } else {
        // Create new company
        const companyInsert: TablesInsert<'companies'> = {
          name: companyName,
          logo_url: companyLogoUrl || null,
          address: companyAddress || null,
          phone: companyPhone || null,
          email: companyEmail || null,
          tax_id: companyTaxId || null,
          currency: companyCurrency,
          created_by: user.id,
        };
        const { data, error } = await supabase
          .from('companies')
          .insert(companyInsert)
          .select()
          .single();
        if (error) throw error;
        savedCompany = data;
        currentCompanyId = data.id;
      }

      // Prepare settings upsert data
      const settingsUpsert: TablesInsert<'settings'> = {
        company_id: currentCompanyId,
        default_tax_rate: parseFloat(defaultTaxRate),
        numbering_prefix: numberingPrefix,
        next_number: parseInt(nextNumber),
        locale: locale,
        timezone: timezone,
      };

      let savedSettings: Tables<'settings'>;

      if (initialSettingsData?.company_id) {
        // Update existing settings
        const { data: updatedSettings, error: updateSettingsError } = await supabase
          .from('settings')
          .update(settingsUpsert as TablesUpdate<'settings'>)
          .eq('company_id', currentCompanyId)
          .select()
          .single();
        if (updateSettingsError) throw updateSettingsError;
        savedSettings = updatedSettings;
      } else {
        // Insert new settings
        const { data: newSettings, error: insertSettingsError } = await supabase
          .from('settings')
          .insert(settingsUpsert)
          .select()
          .single();
        if (insertSettingsError) throw insertSettingsError;
        savedSettings = newSettings;
      }

      onSave(savedCompany, savedSettings);
      toast.success('Settings saved successfully!');
      // onClose is handled by the parent CompanySetupPage for initial setup
      if (!isInitialSetup) {
        onClose();
      }
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error(error.message || 'Failed to save settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isInitialSetup ? 'Complete Your Company Setup' : 'Company & Application Settings'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-6 py-4">
          <h3 className="text-lg font-semibold">Company Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="companyLogoUrl">Logo URL (Optional)</Label>
              <Input
                id="companyLogoUrl"
                value={companyLogoUrl}
                onChange={(e) => setCompanyLogoUrl(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="companyPhone">Phone (Optional)</Label>
              <Input
                id="companyPhone"
                value={companyPhone}
                onChange={(e) => setCompanyPhone(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="companyEmail">Email (Optional)</Label>
              <Input
                id="companyEmail"
                type="email"
                value={companyEmail}
                onChange={(e) => setCompanyEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="companyTaxId">Tax ID (Optional)</Label>
              <Input
                id="companyTaxId"
                value={companyTaxId}
                onChange={(e) => setCompanyTaxId(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="companyCurrency">Default Currency</Label>
              <Select
                value={companyCurrency}
                onValueChange={setCompanyCurrency}
                disabled={loading}
              >
                <SelectTrigger id="companyCurrency">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {commonCurrencies.map(currency => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 grid gap-2">
              <Label htmlFor="companyAddress">Address (Optional)</Label>
              <Textarea
                id="companyAddress"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                rows={2}
                disabled={loading}
              />
            </div>
          </div>

          <h3 className="text-lg font-semibold mt-4">Application Preferences</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="defaultTaxRate">Default Tax Rate (%)</Label>
              <Input
                id="defaultTaxRate"
                type="number"
                step="0.01"
                value={defaultTaxRate}
                onChange={(e) => setDefaultTaxRate(e.target.value)}
                min="0"
                max="100"
                required
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="numberingPrefix">Invoice Numbering Prefix</Label>
              <Input
                id="numberingPrefix"
                value={numberingPrefix}
                onChange={(e) => setNumberingPrefix(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nextNumber">Next Invoice Number</Label>
              <Input
                id="nextNumber"
                type="number"
                value={nextNumber}
                onChange={(e) => setNextNumber(e.target.value)}
                min="1"
                required
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="locale">Locale</Label>
              <Input
                id="locale"
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                required
                disabled={loading}
                placeholder="e.g., en-US, en-PK"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                required
                disabled={loading}
                placeholder="e.g., Asia/Karachi, America/New_York"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Settings'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsForm;