import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAccount, useDisconnect, useConnect } from 'wagmi';
import { supabase } from '@/integrations/supabase/client';

export type EntityType = 'provider' | 'patient' | 'organization' | 'admin';

interface Entity {
  id: string;
  wallet_address: string;
  entity_type: EntityType;
  organization_id: string | null;
  display_name: string | null;
  metadata: Record<string, unknown>;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

interface WalletContextType {
  // Wallet state
  address: string | undefined;
  isConnected: boolean;
  isConnecting: boolean;
  
  // Entity state (from database)
  entity: Entity | null;
  entityLoading: boolean;
  
  // Role detection
  isProvider: boolean;
  isPatient: boolean;
  isOrganization: boolean;
  isAdmin: boolean;
  
  // Mock mode (for testing without contracts)
  mockMode: boolean;
  mockBalance: number;
  
  // Actions
  disconnect: () => void;
  refreshEntity: () => Promise<void>;
  registerEntity: (entityType: EntityType, displayName?: string) => Promise<boolean>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { address, isConnected, isConnecting } = useAccount();
  const { disconnect } = useDisconnect();
  
  const [entity, setEntity] = useState<Entity | null>(null);
  const [entityLoading, setEntityLoading] = useState(false);
  const [mockMode, setMockMode] = useState(true);
  const [mockBalance, setMockBalance] = useState(0);

  // Fetch entity data when wallet connects
  const fetchEntity = async () => {
    if (!address) {
      setEntity(null);
      return;
    }

    setEntityLoading(true);
    try {
      const { data, error } = await supabase
        .from('entities')
        .select('*')
        .eq('wallet_address', address.toLowerCase())
        .maybeSingle();

      if (error) {
        console.error('Error fetching entity:', error);
        setEntity(null);
      } else {
        setEntity(data as Entity | null);
      }

      // Calculate mock balance from rewards ledger
      if (data) {
        const { data: rewards } = await supabase
          .from('rewards_ledger')
          .select('amount')
          .eq('recipient_id', data.id)
          .eq('status', 'confirmed');
        
        if (rewards) {
          const total = rewards.reduce((sum, r) => sum + Number(r.amount), 0);
          setMockBalance(total);
        }
      }
    } catch (err) {
      console.error('Error in fetchEntity:', err);
      setEntity(null);
    } finally {
      setEntityLoading(false);
    }
  };

  // Check mock mode setting
  const checkMockMode = async () => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'mock_mode')
        .single();
      
      if (data) {
        setMockMode((data.value as { enabled: boolean }).enabled);
      }
    } catch (err) {
      console.error('Error checking mock mode:', err);
    }
  };

  useEffect(() => {
    fetchEntity();
  }, [address]);

  useEffect(() => {
    checkMockMode();
  }, []);

  const refreshEntity = async () => {
    await fetchEntity();
  };

  const registerEntity = async (entityType: EntityType, displayName?: string): Promise<boolean> => {
    if (!address) return false;

    try {
      const { error } = await supabase
        .from('entities')
        .insert({
          wallet_address: address.toLowerCase(),
          entity_type: entityType,
          display_name: displayName || null,
          is_verified: false,
        });

      if (error) {
        console.error('Error registering entity:', error);
        return false;
      }

      await fetchEntity();
      return true;
    } catch (err) {
      console.error('Error in registerEntity:', err);
      return false;
    }
  };

  const value: WalletContextType = {
    address,
    isConnected,
    isConnecting,
    entity,
    entityLoading,
    isProvider: entity?.entity_type === 'provider',
    isPatient: entity?.entity_type === 'patient',
    isOrganization: entity?.entity_type === 'organization',
    isAdmin: entity?.entity_type === 'admin',
    mockMode,
    mockBalance,
    disconnect,
    refreshEntity,
    registerEntity,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
