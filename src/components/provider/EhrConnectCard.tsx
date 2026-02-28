import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/contexts/WalletContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Activity, Check, ShieldCheck, Zap } from 'lucide-react';

type EhrType = 'epic' | 'pointclickcare';

const EHR_CONFIG: Record<EhrType, { label: string; authFunction: string }> = {
  epic: { label: 'Epic', authFunction: 'epic-auth' },
  pointclickcare: { label: 'PointClickCare', authFunction: 'pointclickcare-auth' },
};

interface EhrStatus { epic: boolean; pointclickcare: boolean; }

export function EhrConnectCard() {
  const { entity } = useWallet();
  const [status, setStatus] = useState<EhrStatus>({ epic: false, pointclickcare: false });
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<EhrType | null>(null);

  useEffect(() => { if (entity?.id) fetchStatus(); }, [entity?.id]);

  const fetchStatus = async () => {
    if (!entity?.id) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from('ehr_integration_status')
      .select('integration_type, is_active')
      .eq('entity_id', entity.id)
      .in('integration_type', ['epic', 'pointclickcare']);
    const result: EhrStatus = { epic: false, pointclickcare: false };
    if (data) {
      for (const row of data) {
        if (row.is_active && (row.integration_type === 'epic' || row.integration_type === 'pointclickcare')) {
          result[row.integration_type as EhrType] = true;
        }
      }
    }
    setStatus(result);
    setLoading(false);
  };

  const handleConnect = async (type: EhrType) => {
    if (!entity?.id) return;
    setConnecting(type);
    const cfg = EHR_CONFIG[type];
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${cfg.authFunction}?action=authorize&entity_id=${entity.id}`,
        { headers: { 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
      );
      const respData = await res.json();
      if (respData.configured === false) {
        toast({ title: `${cfg.label} Not Configured`, description: 'Ask your organization admin to add credentials.', variant: 'destructive' });
        setConnecting(null);
        return;
      }
      if (respData.authorize_url) {
        window.location.href = respData.authorize_url;
      } else {
        toast({ title: 'Error', description: respData.error || 'Failed to connect', variant: 'destructive' });
        setConnecting(null);
      }
    } catch {
      toast({ title: 'Error', description: `Failed to connect to ${cfg.label}`, variant: 'destructive' });
      setConnecting(null);
    }
  };

  const bothConnected = status.epic && status.pointclickcare;
  const anyConnected = status.epic || status.pointclickcare;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="h-20 animate-pulse bg-muted rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (bothConnected) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-care-green" />
            <div>
              <CardTitle>EHR Connected</CardTitle>
              <CardDescription>Both systems actively sending events</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-2">
            <Badge className="status-success">Epic</Badge>
            <Badge className="status-success">PointClickCare</Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Zap className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <CardTitle>Connect Your EHR</CardTitle>
            <CardDescription>Start earning CARE for every chart</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {anyConnected && (
          <div className="flex gap-2">
            {status.epic && <Badge className="status-success"><Check className="h-3 w-3 mr-1" />Epic</Badge>}
            {status.pointclickcare && <Badge className="status-success"><Check className="h-3 w-3 mr-1" />PCC</Badge>}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          {!status.epic && (
            <Button variant="default" size="sm" className="w-full" onClick={() => handleConnect('epic')} loading={connecting === 'epic'}>
              <Activity className="mr-1.5 h-4 w-4" />
              {connecting === 'epic' ? 'Connecting…' : 'Epic'}
            </Button>
          )}
          {!status.pointclickcare && (
            <Button variant="default" size="sm" className="w-full" onClick={() => handleConnect('pointclickcare')} loading={connecting === 'pointclickcare'}>
              <Activity className="mr-1.5 h-4 w-4" />
              {connecting === 'pointclickcare' ? 'Connecting…' : 'PCC'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
