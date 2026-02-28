import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { KeyRound, Copy, Download, CheckCircle2, Loader2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface EpicKeyGeneratorProps {
  onPrivateKeyGenerated: (pem: string) => void;
  onJwksGenerated?: (jwks: object) => void;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function formatPem(base64: string, label: string): string {
  const lines = base64.match(/.{1,64}/g) || [];
  return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----`;
}

export default function EpicKeyGenerator({ onPrivateKeyGenerated, onJwksGenerated }: EpicKeyGeneratorProps) {
  const [generating, setGenerating] = useState(false);
  const [jwkPublicKey, setJwkPublicKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    setCopied(false);
    try {
      const keyPair = await crypto.subtle.generateKey(
        {
          name: 'RSASSA-PKCS1-v1_5',
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-384',
        },
        true,
        ['sign', 'verify']
      );

      // Export private key as PKCS8 PEM
      const pkcs8 = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
      const pem = formatPem(arrayBufferToBase64(pkcs8), 'PRIVATE KEY');

      // Export public key as JWK for Epic
      const jwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
      // Add required fields for Epic JWKS
      const epicJwk = {
        ...jwk,
        kid: crypto.randomUUID(),
        use: 'sig',
      };

      const jwksObj = { keys: [epicJwk] };
      const jwksJson = JSON.stringify(jwksObj, null, 2);
      setJwkPublicKey(jwksJson);

      // Auto-fill the PEM private key
      onPrivateKeyGenerated(pem);
      // Pass JWKS object to parent for saving
      onJwksGenerated?.(jwksObj);

      toast({
        title: 'Key pair generated',
        description: 'Private key has been auto-filled. Copy the JWK below and paste it into Epic App Orchard.',
      });
    } catch (err) {
      console.error('Key generation failed:', err);
      toast({
        title: 'Key generation failed',
        description: 'Your browser may not support RSA key generation.',
        variant: 'destructive',
      });
    }
    setGenerating(false);
  };

  const handleCopyJwk = async () => {
    if (!jwkPublicKey) return;
    try {
      await navigator.clipboard.writeText(jwkPublicKey);
      setCopied(true);
      toast({ title: 'JWK copied', description: 'Paste this into Epic App Orchard → Backend Services → Public Key.' });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast({ title: 'Copy failed', description: 'Please select and copy manually.', variant: 'destructive' });
    }
  };

  const handleDownloadJwk = () => {
    if (!jwkPublicKey) return;
    const blob = new Blob([jwkPublicKey], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'epic-jwks.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-xs">
          <KeyRound className="h-3.5 w-3.5" />
          {open ? 'Hide' : 'Generate'} RSA Key Pair
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3">
        <Card className="border-border/40 bg-muted/10">
          <CardContent className="p-4 space-y-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                This generates an RSA-2048 key pair in your browser. Nothing leaves this page.
              </p>
              <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-0.5">
                <li>Click <strong>Generate</strong> — private key auto-fills above</li>
                <li>Copy the <strong>JWK</strong> below</li>
                <li>In <a href="https://fhir.epic.com/Developer/Apps" target="_blank" rel="noopener noreferrer" className="text-primary underline">Epic App Orchard</a> → your app → <strong>Backend Services</strong> → paste into <strong>Public Key</strong></li>
              </ol>
            </div>

            <Button
              size="sm"
              variant="secondary"
              onClick={handleGenerate}
              disabled={generating}
              className="gap-2"
            >
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
              Generate Key Pair
            </Button>

            {jwkPublicKey && (
              <div className="space-y-2 animate-fade-in-up">
                <label className="text-xs font-medium text-muted-foreground">
                  Public Key (JWK) — paste into Epic
                </label>
                <pre className="rounded-md border border-border/40 bg-background p-3 text-xs font-mono overflow-x-auto max-h-48 whitespace-pre-wrap break-all">
                  {jwkPublicKey}
                </pre>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopyJwk} className="gap-1.5 text-xs">
                    {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--care-green))]" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Copied' : 'Copy JWK'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleDownloadJwk} className="gap-1.5 text-xs">
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
