import React, { useState, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/contexts/WalletContext';
import { toast } from '@/hooks/use-toast';
import { QrCode, Copy, Download, Link2, ArrowRight } from 'lucide-react';

export default function ProviderInvoice() {
  const { isConnected, address } = useWallet();
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [generated, setGenerated] = useState(false);

  const paymentUrl = useMemo(() => {
    if (!address || !amount) return '';
    const base = window.location.origin;
    const params = new URLSearchParams({
      to: address,
      amount,
      ...(memo ? { memo } : {}),
    });
    return `${base}/patient/pay?${params.toString()}`;
  }, [address, amount, memo]);

  const handleGenerate = () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({ title: 'Enter a valid amount', variant: 'destructive' });
      return;
    }
    setGenerated(true);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(paymentUrl);
    toast({ title: 'Payment link copied!' });
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById('invoice-qr');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = 512;
      canvas.height = 512;
      ctx?.drawImage(img, 0, 0, 512, 512);
      const a = document.createElement('a');
      a.download = `carewallet-invoice-${amount}-CARE.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  if (!isConnected || !address) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <QrCode className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Connect your wallet to generate invoices.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-lg space-y-6">
        <div className="animate-fade-in-up">
          <h1 className="page-header inline-block">Generate Invoice</h1>
          <p className="text-muted-foreground">Create a QR code for patients to pay you in CARE tokens</p>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><QrCode className="h-5 w-5" /> Invoice Details</CardTitle>
            <CardDescription>Set the amount and an optional memo for the patient</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (CARE)</label>
              <Input
                type="number"
                placeholder="e.g. 50"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setGenerated(false); }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Memo / Description (optional)</label>
              <Input
                placeholder="e.g. Office visit copay"
                value={memo}
                onChange={(e) => { setMemo(e.target.value); setGenerated(false); }}
              />
            </div>
            <Button className="w-full" variant="gradient" onClick={handleGenerate} disabled={!amount || parseFloat(amount) <= 0}>
              Generate QR Code <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* QR Result */}
        {generated && paymentUrl && (
          <Card>
            <CardContent className="pt-6 flex flex-col items-center gap-6">
              <div className="p-4 bg-white rounded-xl shadow-md">
                <QRCodeSVG
                  id="invoice-qr"
                  value={paymentUrl}
                  size={240}
                  level="H"
                  includeMargin
                  bgColor="#ffffff"
                  fgColor="#1a1a2e"
                />
              </div>

              <div className="text-center space-y-1">
                <p className="text-2xl font-bold text-[hsl(var(--care-teal))]">{parseFloat(amount).toLocaleString()} CARE</p>
                {memo && <p className="text-sm text-muted-foreground">{memo}</p>}
              </div>

              <div className="flex gap-2 w-full">
                <Button variant="outline" className="flex-1" onClick={handleCopyLink}>
                  <Copy className="h-4 w-4 mr-2" /> Copy Link
                </Button>
                <Button variant="outline" className="flex-1" onClick={handleDownloadQR}>
                  <Download className="h-4 w-4 mr-2" /> Download
                </Button>
              </div>

              <div className="w-full">
                <p className="text-xs text-muted-foreground mb-1">Payment Link</p>
                <code className="block text-xs font-mono bg-muted/60 px-3 py-2 rounded-lg border border-border/30 break-all">
                  {paymentUrl}
                </code>
              </div>
            </CardContent>
          </Card>
        )}

        {/* How it works */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <Badge className="bg-[hsl(var(--care-teal))] text-primary-foreground shrink-0 border-0">1</Badge>
              <p>Enter the CARE amount for the service or copay.</p>
            </div>
            <div className="flex items-start gap-3">
              <Badge className="bg-[hsl(var(--care-teal))] text-primary-foreground shrink-0 border-0">2</Badge>
              <p>A QR code and payment link are generated with your wallet address.</p>
            </div>
            <div className="flex items-start gap-3">
              <Badge className="bg-[hsl(var(--care-teal))] text-primary-foreground shrink-0 border-0">3</Badge>
              <p>Share the QR code or link with the patient. They confirm payment from their wallet.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
