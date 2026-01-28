import { useState, useEffect } from 'react';
import { useChainId, useSwitchChain, useWaitForTransactionReceipt, useDeployContract } from 'wagmi';
import { polygonAmoy, polygon } from 'wagmi/chains';
import { parseEther } from 'viem';
import { useWallet } from '@/contexts/WalletContext';
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

export default function DeployContract() {
  const { address, isConnected, isConnecting } = useWallet();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  
  const { 
    deployContract, 
    data: txHash, 
    isPending: isDeploying, 
    isError: deployError,
    error: deployErrorDetails,
    reset: resetDeploy 
  } = useDeployContract();

  const { 
    data: receipt, 
    isLoading: isWaitingReceipt,
    isSuccess: isConfirmed 
  } = useWaitForTransactionReceipt({ hash: txHash });

  const [step, setStep] = useState<DeploymentStep>('idle');
  const [deployedAddress, setDeployedAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialSupply, setInitialSupply] = useState<string>('0');

  const isAmoy = chainId === polygonAmoy.id;
  const isPolygon = chainId === polygon.id;
  const isCorrectNetwork = isAmoy || isPolygon;

  const networkName = isAmoy ? 'Polygon Amoy (Testnet)' : isPolygon ? 'Polygon Mainnet' : 'Unknown';
  const explorerUrl = isAmoy 
    ? 'https://amoy.polygonscan.com' 
    : 'https://polygonscan.com';

  const handleSwitchNetwork = async (targetChainId: number) => {
    try {
      await switchChain({ chainId: targetChainId });
    } catch (err: any) {
      // If chain not configured in wallet, try to add it first
      if (err?.message?.includes('Chain not configured') || err?.code === 4902) {
        try {
          const chainConfig = targetChainId === polygonAmoy.id 
            ? {
                chainId: `0x${polygonAmoy.id.toString(16)}`,
                chainName: 'Polygon Amoy Testnet',
                nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
                rpcUrls: ['https://rpc-amoy.polygon.technology'],
                blockExplorerUrls: ['https://amoy.polygonscan.com'],
              }
            : {
                chainId: `0x${polygon.id.toString(16)}`,
                chainName: 'Polygon Mainnet',
                nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
                rpcUrls: ['https://polygon-rpc.com'],
                blockExplorerUrls: ['https://polygonscan.com'],
              };
          
          await (window as any).ethereum?.request({
            method: 'wallet_addEthereumChain',
            params: [chainConfig],
          });
          toast.success('Network added! Please try again.');
        } catch (addError) {
          toast.error('Failed to add network. Please add it manually in your wallet.');
        }
      } else {
        toast.error('Failed to switch network. Please switch manually in your wallet.');
      }
    }
  };

  // Track deployment state changes
  useEffect(() => {
    if (isDeploying) {
      setStep('confirming');
    }
  }, [isDeploying]);

  useEffect(() => {
    if (txHash && isWaitingReceipt) {
      setStep('deploying');
      toast.info('Transaction submitted! Waiting for confirmation...');
    }
  }, [txHash, isWaitingReceipt]);

  useEffect(() => {
    if (isConfirmed && receipt?.contractAddress) {
      setDeployedAddress(receipt.contractAddress);
      setStep('success');
      toast.success('CareCoin deployed successfully!');
    }
  }, [isConfirmed, receipt]);

  useEffect(() => {
    if (deployError && deployErrorDetails) {
      setError(deployErrorDetails.message || 'Deployment failed');
      setStep('error');
      toast.error('Deployment failed');
    }
  }, [deployError, deployErrorDetails]);

  const handleDeploy = () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    setError(null);

    // Parse initial supply (convert from CARE to wei)
    const supplyWei = initialSupply ? parseEther(initialSupply) : DEFAULT_INITIAL_SUPPLY;

    deployContract({
      abi: CARE_COIN_ABI,
      bytecode: CARE_COIN_BYTECODE,
      args: [TREASURY_ADDRESS, supplyWei],
    });
  };

  const handleReset = () => {
    resetDeploy();
    setStep('idle');
    setError(null);
    setDeployedAddress(null);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Deploy CareCoin</h1>
          <p className="text-muted-foreground">
            Deploy the CARE token contract directly from your browser
          </p>
        </div>

        {/* Wallet Connection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Wallet Connection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isConnecting ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <p className="text-muted-foreground">Connecting wallet...</p>
              </div>
            ) : !isConnected ? (
              <div className="flex flex-col items-center gap-4">
                <p className="text-muted-foreground">Connect your wallet to deploy</p>
                <ConnectWalletButton />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Connected:</span>
                  <Badge variant="outline" className="font-mono">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Network:</Label>
                  <Select 
                    value={chainId?.toString()} 
                    onValueChange={(value) => handleSwitchNetwork(parseInt(value))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select network" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={polygon.id.toString()}>
                        Polygon Mainnet
                      </SelectItem>
                      <SelectItem value={polygonAmoy.id.toString()}>
                        Polygon Amoy (Testnet)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {!isCorrectNetwork && (
                    <p className="text-xs text-destructive">
                      Please switch to a supported network
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deployment Config */}
        {isConnected && isCorrectNetwork && step === 'idle' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Deployment Configuration
              </CardTitle>
              <CardDescription>
                Configure the initial parameters for CareCoin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="treasury">Treasury Address</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    id="treasury" 
                    value={TREASURY_ADDRESS} 
                    disabled 
                    className="font-mono text-sm"
                  />
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => copyToClipboard(TREASURY_ADDRESS, 'Treasury address')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Network fees (10%) will be sent to this address
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="initialSupply">Initial Supply (CARE)</Label>
                <Input 
                  id="initialSupply" 
                  type="number"
                  value={initialSupply}
                  onChange={(e) => setInitialSupply(e.target.value)}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">
                  Tokens minted to treasury on deploy. Use 0 to mint only via rewards.
                </p>
              </div>

              <Separator />

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium">Contract Features</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Max Supply: 1,000,000,000 CARE</li>
                  <li>• Network Fee: 10% on reward mints</li>
                  <li>• Role-based access (MINTER, PAUSER, ADMIN)</li>
                  <li>• Pausable for emergencies</li>
                  <li>• Burnable tokens</li>
                </ul>
              </div>

              <Button 
                onClick={handleDeploy} 
                className="w-full" 
                size="lg"
                disabled={isDeploying}
              >
                <Rocket className="h-4 w-4 mr-2" />
                Deploy CareCoin
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Deploying State */}
        {(step === 'confirming' || step === 'deploying') && (
          <Card>
            <CardContent className="py-8">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <div className="text-center">
                  <h3 className="font-semibold text-lg">
                    {step === 'confirming' ? 'Confirm in Wallet' : 'Deploying Contract...'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {step === 'confirming' 
                      ? 'Please confirm the transaction in your wallet'
                      : 'Waiting for blockchain confirmation'}
                  </p>
                </div>
                {txHash && (
                  <Button 
                    variant="link" 
                    onClick={() => window.open(`${explorerUrl}/tx/${txHash}`, '_blank')}
                  >
                    View on Explorer <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success State */}
        {step === 'success' && deployedAddress && (
          <Card className="border-green-500/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                Deployment Successful!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTitle>Contract Address</AlertTitle>
                <AlertDescription className="mt-2">
                  <div className="flex items-center gap-2">
                    <code className="bg-muted px-2 py-1 rounded text-sm font-mono break-all">
                      {deployedAddress}
                    </code>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => copyToClipboard(deployedAddress, 'Contract address')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => window.open(`${explorerUrl}/address/${deployedAddress}`, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on Explorer
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => window.open(`${explorerUrl}/address/${deployedAddress}#code`, '_blank')}
                >
                  Verify Contract
                </Button>
              </div>

              <Separator />

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
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
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Deployment Failed</AlertTitle>
            <AlertDescription className="mt-2">
              <p>{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3"
                onClick={handleReset}
              >
                Try Again
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
