import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  Building2,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  Landmark,
} from 'lucide-react';

const achSchema = z.object({
  routing_number: z.string().regex(/^\d{9}$/, 'Routing number must be exactly 9 digits'),
  account_number: z.string().regex(/^\d{4,17}$/, 'Account number must be 4–17 digits'),
  account_holder_name: z.string().trim().min(1, 'Name is required').max(100, 'Max 100 characters'),
  account_type: z.enum(['checking', 'savings']),
});

type AchFormData = z.infer<typeof achSchema>;

interface AchDetailsFormProps {
  entity: { id: string; wallet_address: string } | null;
  onSuccess?: () => void;
  isConnected?: boolean;
}

export default function AchDetailsForm({ entity, onSuccess, isConnected }: AchDetailsFormProps) {
  const [form, setForm] = useState<AchFormData>({
    routing_number: '',
    account_number: '',
    account_holder_name: '',
    account_type: 'checking',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof AchFormData, string>>>({});
  const [showAccount, setShowAccount] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const update = (field: keyof AchFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async () => {
    const result = achSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: typeof errors = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0] as keyof AchFormData;
        fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    if (!entity?.id) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect', {
        body: {
          action: 'save-ach',
          entity_id: entity.id,
          wallet_address: entity.wallet_address,
          ...result.data,
        },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      toast.success('Bank account connected successfully!');
      setForm({ routing_number: '', account_number: '', account_holder_name: '', account_type: 'checking' });
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save bank details');
    } finally {
      setSubmitting(false);
    }
  };

  if (isConnected) {
    return (
      <Card className="border-2 border-transparent hover:border-primary transition-all">
        <CardContent className="pt-6 pb-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Landmark className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">Direct Deposit (ACH)</h3>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Connected
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Your bank account is linked. Withdrawals will be deposited via ACH.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-transparent hover:border-primary transition-all">
      <CardContent className="pt-6 pb-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <Landmark className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="font-semibold text-lg">Direct Deposit (ACH)</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Enter your bank details to receive withdrawals via ACH direct deposit.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="account_holder_name">Account Holder Name</Label>
                <Input
                  id="account_holder_name"
                  placeholder="Jane Doe"
                  value={form.account_holder_name}
                  onChange={(e) => update('account_holder_name', e.target.value)}
                  maxLength={100}
                />
                {errors.account_holder_name && (
                  <p className="text-xs text-destructive mt-1">{errors.account_holder_name}</p>
                )}
              </div>

              <div>
                <Label htmlFor="routing_number">Routing Number</Label>
                <Input
                  id="routing_number"
                  placeholder="123456789"
                  value={form.routing_number}
                  onChange={(e) => update('routing_number', e.target.value.replace(/\D/g, '').slice(0, 9))}
                  inputMode="numeric"
                />
                {errors.routing_number && (
                  <p className="text-xs text-destructive mt-1">{errors.routing_number}</p>
                )}
              </div>

              <div>
                <Label htmlFor="account_number">Account Number</Label>
                <div className="relative">
                  <Input
                    id="account_number"
                    type={showAccount ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.account_number}
                    onChange={(e) => update('account_number', e.target.value.replace(/\D/g, '').slice(0, 17))}
                    inputMode="numeric"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => setShowAccount(!showAccount)}
                  >
                    {showAccount ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {errors.account_number && (
                  <p className="text-xs text-destructive mt-1">{errors.account_number}</p>
                )}
              </div>

              <div>
                <Label>Account Type</Label>
                <RadioGroup
                  value={form.account_type}
                  onValueChange={(v) => update('account_type', v)}
                  className="flex gap-4 mt-1"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="checking" id="checking" />
                    <Label htmlFor="checking" className="font-normal cursor-pointer">Checking</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="savings" id="savings" />
                    <Label htmlFor="savings" className="font-normal cursor-pointer">Savings</Label>
                  </div>
                </RadioGroup>
              </div>

              <Button onClick={handleSubmit} disabled={submitting} className="w-full mt-2">
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Building2 className="h-4 w-4 mr-2" />}
                Connect Bank Account
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
