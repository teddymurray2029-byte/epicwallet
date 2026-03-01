import { useState, useEffect } from 'react';
import { useChainId, useWaitForTransactionReceipt, useWalletClient, useAccount, useSwitchChain } from 'wagmi';
import { polygonAmoy, polygon } from 'wagmi/chains';
import { parseEther, type Hash, encodeDeployData, getAddress, isAddress } from 'viem';
import { useWallet } from '@/contexts/WalletContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Rocket, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  ExternalLink,
  Loader2,
  Wallet,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { ConnectWalletButton } from '@/components/wallet/ConnectWalletButton';
import { CARE_COIN_BYTECODE, CARE_COIN_ABI, TREASURY_ADDRESS, DEFAULT_INITIAL_SUPPLY } from '@/lib/careCoinContract';

type DeploymentStep = 'idle' | 'confirming' | 'deploying' | 'success' | 'error';

type RpcLikeError = {
  shortMessage?: string;
  message?: string;
  code?: number;
  cause?: {
    shortMessage?: string;
    message?: string;
  };
};

const getRpcErrorMessage = (err: unknown) => {
  const error = err as RpcLikeError;
  return error?.shortMessage || error?.cause?.shortMessage || error?.cause?.message || error?.message || '';
};

const isInvalidParamsRpcError = (err: unknown) => /invalid params/i.test(getRpcErrorMessage(err));

const steps = [
  { label: 'Configure', key: 'idle' },
  { label: 'Confirm', key: 'confirming' },
  { label: 'Deploy', key: 'deploying' },
  { label: 'Complete', key: 'success' },
];

export default function DeployContract() {
  const { address, isConnected, isConnecting } = useWallet();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const { connector } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  
  const [step, setStep] = useState<DeploymentStep>('idle');
  const [deployedAddress, setDeployedAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialSupply, setInitialSupply] = useState<string>('0');
  const [txHash, setTxHash] = useState<Hash | undefined>(undefined);

  const { data: receipt, isLoading: isWaitingReceipt, isSuccess: isConfirmed, isError: isReceiptError, error: receiptError } = useWaitForTransactionReceipt({ hash: txHash });

  const isAmoy = chainId === polygonAmoy.id;
  const isPolygon = chainId === polygon.id;
  const isCorrectNetwork = isAmoy || isPolygon;

  const explorerUrl = isAmoy ? 'https://amoy.polygonscan.com' : 'https://polygonscan.com';

  const currentStepIndex = steps.findIndex(s => s.key === step);

  const handleSwitchNetwork = async (targetChainId: number) => {
    type Eip1193Provider = {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };

    const chainConfig = targetChainId === polygonAmoy.id
      ? {
          chainId: `0x${polygonAmoy.id.toString(16)}`,
          chainName: 'Polygon Amoy Testnet',
          nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
          rpcUrls: ['https://rpc.ankr.com/polygon_amoy'],
          blockExplorerUrls: ['https://amoy.polygonscan.com'],
        }
      : {
          chainId: `0x${polygon.id.toString(16)}`,
          chainName: 'Polygon Mainnet',
          nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
          rpcUrls: ['https://polygon-rpc.com'],
          blockExplorerUrls: ['https://polygonscan.com'],
        };

    try {
      await switchChainAsync({ chainId: targetChainId });
      return;
    } catch {
      // Fallback to direct provider request for wallets/connectors with delayed wagmi sync
    }

    const injectedProvider = (window as any).ethereum as Eip1193Provider | undefined;
    const connectorProvider = typeof (connector as any)?.getProvider === 'function'
      ? await (connector as any).getProvider().catch(() => undefined) as Eip1193Provider | undefined
      : undefined;
    const transport = connectorProvider ?? injectedProvider;

    if (!transport) {
      toast.error('No wallet transport found. Reconnect your wallet and try again.');
      return;
    }

    try {
      await transport.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: chainConfig.chainId }] });
    } catch (switchError: any) {
      if (switchError?.code === 4902) {
        try {
          await transport.request({ method: 'wallet_addEthereumChain', params: [chainConfig] });
        } catch (addError: any) {
          toast.error(addError?.message || 'Failed to add network.');
        }
      } else if (switchError?.code === 4001) {
        toast.error('Network switch was rejected in wallet.');
      } else {
        toast.error(switchError?.message || 'Failed to switch network.');
      }
    }
  };

  useEffect(() => {
    if (isConfirmed && receipt) {
      if (receipt.contractAddress) {
        setDeployedAddress(receipt.contractAddress);
        setStep('success');
        toast.success('CareWallet contract deployed successfully!');
      } else if (receipt.status === 'reverted') {
        setError('Transaction reverted on-chain. The contract deployment failed — check your parameters and try again.');
        setStep('error');
        toast.error('Transaction reverted on-chain.');
      } else {
        setError('Transaction confirmed but no contract address was returned. It may have been a non-deploy transaction.');
        setStep('error');
        toast.error('No contract address in receipt.');
      }
    }
  }, [isConfirmed, receipt]);

  useEffect(() => {
    if (txHash && isWaitingReceipt) { setStep('deploying'); }
  }, [txHash, isWaitingReceipt]);

  useEffect(() => {
    if (isReceiptError && txHash) {
      const msg = receiptError?.message || 'Transaction failed or was dropped';
      setError(msg);
      setStep('error');
      toast.error('Transaction failed: ' + msg);
    }
  }, [isReceiptError, receiptError, txHash]);

  const handleDeploy = async () => {
    type Eip1193Provider = {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };

    const injectedProvider = (window as any).ethereum as Eip1193Provider | undefined;
    const connectorProvider = typeof (connector as any)?.getProvider === 'function'
      ? await (connector as any).getProvider().catch(() => undefined) as Eip1193Provider | undefined
      : undefined;

    const providerCandidates = [connectorProvider, injectedProvider].filter(
      (provider): provider is Eip1193Provider => Boolean(provider)
    );
    const transports = providerCandidates.filter((provider, index) => providerCandidates.indexOf(provider) === index);
    const primaryTransport = transports[0];

    let deployAddress = address ?? walletClient?.account?.address;

    if (!deployAddress && transports.length > 0) {
      for (const provider of transports) {
        try {
          const existingAccounts = await provider.request({ method: 'eth_accounts' }) as string[];
          if (existingAccounts?.length > 0) {
            deployAddress = existingAccounts[0];
            break;
          }
        } catch {
          // try next provider
        }
      }

      if (!deployAddress && primaryTransport) {
        try {
          const requestedAccounts = await primaryTransport.request({ method: 'eth_requestAccounts' }) as string[];
          if (requestedAccounts?.length > 0) {
            deployAddress = requestedAccounts[0];
          }
        } catch {
          // ignore and show unified error below
        }
      }
    }

    if (!deployAddress) {
      toast.error('Please reconnect your wallet and try again.');
      return;
    }

    if (!primaryTransport && !walletClient) {
      toast.error('No wallet transport found. Reconnect your wallet and try again.');
      return;
    }

    if (!isCorrectNetwork) {
      toast.error('Please switch to Polygon Mainnet or Amoy Testnet first');
      return;
    }

    if (primaryTransport && chainId) {
      try {
        const walletChainHex = await primaryTransport.request({ method: 'eth_chainId' }) as string;
        if (typeof walletChainHex === 'string') {
          const walletChainId = Number.parseInt(walletChainHex, 16);
          if (Number.isFinite(walletChainId) && walletChainId !== chainId) {
            toast.error('Wallet network is out of sync. Switch network in wallet and try again.');
            return;
          }
        }
      } catch {
        // non-blocking: some providers may not expose chainId reliably
      }
    }

    setError(null);
    setStep('confirming');

    try {
      const supplyWei = initialSupply ? parseEther(initialSupply) : DEFAULT_INITIAL_SUPPLY;
      toast.info('Please confirm the transaction in your wallet...');
      const deployData = encodeDeployData({ abi: CARE_COIN_ABI, bytecode: CARE_COIN_BYTECODE, args: [TREASURY_ADDRESS, supplyWei] });

      const normalizedDeployAddress = (() => {
        const trimmed = deployAddress!.trim();
        const withPrefix = trimmed.toLowerCase().startsWith('0x') ? `0x${trimmed.slice(2)}` : `0x${trimmed}`;
        return withPrefix as `0x${string}`;
      })();

      if (!isAddress(normalizedDeployAddress)) {
        throw new Error('Wallet returned an invalid deployer address.');
      }

      const txBaseParams = {
        from: getAddress(normalizedDeployAddress),
        data: deployData,
        value: '0x0' as const,
      };

      let hash: Hash | undefined;
      let lastError: unknown;

      if (walletClient) {
        try {
          hash = await walletClient.deployContract({
            abi: CARE_COIN_ABI as any,
            bytecode: CARE_COIN_BYTECODE as `0x${string}`,
            args: [TREASURY_ADDRESS, supplyWei],
            account: getAddress(normalizedDeployAddress),
            chain: walletClient.chain ?? (isAmoy ? polygonAmoy : polygon),
          });
        } catch (walletClientError) {
          lastError = walletClientError;
          if (!isInvalidParamsRpcError(walletClientError)) {
            throw walletClientError;
          }
          console.warn('walletClient.deployContract invalid params, trying raw provider fallback:', walletClientError);
        }
      }

      if (!hash) {
        for (const transport of transports) {
          try {
            hash = await transport.request({ method: 'eth_sendTransaction', params: [txBaseParams] }) as Hash;
            break;
          } catch (transportError) {
            lastError = transportError;
            const errorCode = (transportError as RpcLikeError)?.code;

            if (errorCode === 4001) {
              throw transportError;
            }

            if (!isInvalidParamsRpcError(transportError)) {
              continue;
            }

            try {
              const gasEstimate = await transport.request({ method: 'eth_estimateGas', params: [txBaseParams] });
              if (typeof gasEstimate === 'string') {
                hash = await transport.request({ method: 'eth_sendTransaction', params: [{ ...txBaseParams, gas: gasEstimate }] }) as Hash;
                break;
              }
            } catch (gasRetryError) {
              lastError = gasRetryError;
              console.warn('Gas retry failed on provider:', gasRetryError);
            }
          }
        }
      }

      if (!hash && walletClient) {
        try {
          hash = await walletClient.request({ method: 'eth_sendTransaction', params: [txBaseParams as any] }) as Hash;
        } catch (walletClientRequestError) {
          lastError = walletClientRequestError;
        }
      }

      if (!hash) {
        throw lastError ?? new Error('Wallet did not return a transaction hash.');
      }

      setTxHash(hash);
      toast.info('Transaction submitted! Waiting for confirmation...');
    } catch (err: unknown) {
      console.error('Deploy error:', err);
      const rawErrorMessage = getRpcErrorMessage(err);
      const errorMessage = isInvalidParamsRpcError(err)
        ? 'Wallet rejected deployment parameters. Re-open wallet, switch network once, and retry.'
        : rawErrorMessage || 'Deployment failed';
      setError(errorMessage);
      setStep('error');
      toast.error('Deployment failed: ' + errorMessage);
    }
  };

  const handleReset = () => { setStep('idle'); setError(null); setDeployedAddress(null); setTxHash(undefined); };
  const copyToClipboard = (text: string, label: string) => { navigator.clipboard.writeText(text); toast.success(`${label} copied to clipboard`); };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 animate-fade-in-up">
          <h1 className="text-3xl font-bold page-header inline-block">Deploy CareWallet</h1>
          <p className="text-muted-foreground">Deploy the CARE token contract directly from your browser</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 animate-fade-in-up" style={{ animationDelay: '80ms' }}>
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                i <= currentStepIndex
                  ? 'bg-gradient-to-br from-primary to-care-teal text-primary-foreground shadow-[var(--shadow-glow-teal)]'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {i < currentStepIndex ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`text-xs hidden sm:inline ${i <= currentStepIndex ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{s.label}</span>
              {i < steps.length - 1 && <div className={`h-0.5 w-8 rounded transition-colors duration-300 ${i < currentStepIndex ? 'bg-primary' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>

        {/* Wallet Connection */}
        <Card className="animate-fade-in-up" style={{ animationDelay: '160ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" />Wallet Connection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isConnecting ? (
              <div className="flex flex-col items-center gap-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /><p className="text-muted-foreground">Connecting wallet...</p></div>
            ) : !isConnected ? (
              <div className="flex flex-col items-center gap-4"><p className="text-muted-foreground">Connect your wallet to deploy</p><ConnectWalletButton /></div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Connected:</span>
                  <Badge variant="outline" className="font-mono">{address?.slice(0, 6)}...{address?.slice(-4)}</Badge>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Network:</Label>
                  <Select value={chainId?.toString()} onValueChange={(value) => handleSwitchNetwork(parseInt(value))}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select network" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={polygon.id.toString()}>Polygon Mainnet</SelectItem>
                      <SelectItem value={polygonAmoy.id.toString()}>Polygon Amoy (Testnet)</SelectItem>
                    </SelectContent>
                  </Select>
                  {!isCorrectNetwork && <p className="text-xs text-destructive">Please switch to a supported network</p>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deployment Config */}
        {isConnected && isCorrectNetwork && step === 'idle' && (
          <Card className="animate-fade-in-up" style={{ animationDelay: '240ms' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Deployment Configuration</CardTitle>
              <CardDescription>Configure the initial parameters for CareWallet</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="treasury">Treasury Address</Label>
                <div className="flex items-center gap-2">
                  <Input id="treasury" value={TREASURY_ADDRESS} disabled className="font-mono text-sm" />
                  <Button variant="ghost" size="icon" onClick={() => copyToClipboard(TREASURY_ADDRESS, 'Treasury address')}><Copy className="h-4 w-4" /></Button>
                </div>
                <p className="text-xs text-muted-foreground">Network fees (10%) will be sent to this address</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="initialSupply">Initial Supply (CARE)</Label>
                <Input id="initialSupply" type="number" value={initialSupply} onChange={(e) => setInitialSupply(e.target.value)} placeholder="0" />
                <p className="text-xs text-muted-foreground">Tokens minted to treasury on deploy. Use 0 to mint only via rewards.</p>
              </div>
              <Separator />
              <div className="glass-card rounded-lg p-4 space-y-2">
                <h4 className="font-medium">Contract Features</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Max Supply: 1,000,000,000 CARE</li>
                  <li>• Network Fee: 10% on reward mints</li>
                  <li>• Role-based access (MINTER, PAUSER, ADMIN)</li>
                  <li>• Pausable for emergencies</li>
                  <li>• Burnable tokens</li>
                </ul>
              </div>
              <Button onClick={handleDeploy} variant="gradient" className="w-full" size="lg">
                <Rocket className="h-4 w-4 mr-2" />
                Deploy CareWallet
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Deploying State */}
        {(step === 'confirming' || step === 'deploying') && (
          <Card className="animate-scale-pop">
            <CardContent className="py-8">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <div className="text-center">
                  <h3 className="font-semibold text-lg">{step === 'confirming' ? 'Confirm in Wallet' : 'Deploying Contract...'}</h3>
                  <p className="text-sm text-muted-foreground">{step === 'confirming' ? 'Please confirm the transaction in your wallet' : 'Waiting for blockchain confirmation'}</p>
                </div>
                {txHash && (
                  <Button variant="link" onClick={() => window.open(`${explorerUrl}/tx/${txHash}`, '_blank')}>
                    View on Explorer <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success State */}
        {step === 'success' && deployedAddress && (
          <Card className="border-[hsl(var(--care-green))]/50 shimmer-border animate-scale-pop relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--care-green)/0.1)_0%,transparent_60%)] pointer-events-none" />
            <CardHeader className="relative">
              <CardTitle className="flex items-center gap-2 text-care-green">
                <CheckCircle2 className="h-5 w-5" />
                Deployment Successful!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 relative">
              <Alert>
                <AlertTitle>Contract Address</AlertTitle>
                <AlertDescription className="mt-2">
                  <div className="flex items-center gap-2">
                    <code className="bg-muted/60 px-3 py-1.5 rounded-md text-sm font-mono break-all border border-border/30">{deployedAddress}</code>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard(deployedAddress, 'Contract address')}><Copy className="h-4 w-4" /></Button>
                  </div>
                </AlertDescription>
              </Alert>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" className="flex-1" onClick={() => window.open(`${explorerUrl}/address/${deployedAddress}`, '_blank')}>
                  <ExternalLink className="h-4 w-4 mr-2" />View on Explorer
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => window.open(`${explorerUrl}/address/${deployedAddress}#code`, '_blank')}>Verify Contract</Button>
                <Button variant="outline" className="flex-1" onClick={() => copyToClipboard(JSON.stringify(CARE_COIN_ABI, null, 2), 'ABI')}>
                  <Copy className="h-4 w-4 mr-2" />Copy ABI
                </Button>
              </div>
              <Separator />
              <div className="glass-card rounded-lg p-4 space-y-2">
                <h4 className="font-medium">Next Steps</h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Copy the contract address above</li>
                  <li>Update <code className="bg-muted px-1 rounded">src/lib/wagmi.ts</code> with the address</li>
                  <li>Verify the contract on Polygonscan for transparency</li>
                  <li>Test the integration on the dashboard</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {step === 'error' && (
          <Alert variant="destructive" className="animate-fade-in-up">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Deployment Failed</AlertTitle>
            <AlertDescription className="mt-2">
              <p>{error}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={handleReset}>Try Again</Button>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </DashboardLayout>
  );
}
