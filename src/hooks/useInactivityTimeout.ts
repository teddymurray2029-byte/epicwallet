import { useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_MS = 2 * 60 * 1000;  // warn 2 min before

export function useInactivityTimeout(onTimeout: () => void, enabled: boolean) {
  const { toast } = useToast();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);

    if (!enabled) return;

    warningRef.current = setTimeout(() => {
      toast({
        title: 'Session Expiring',
        description: 'Your session will expire in 2 minutes due to inactivity.',
        variant: 'destructive',
      });
    }, TIMEOUT_MS - WARNING_MS);

    timeoutRef.current = setTimeout(() => {
      onTimeout();
      toast({
        title: 'Session Expired',
        description: 'You have been disconnected due to inactivity (HIPAA requirement).',
      });
    }, TIMEOUT_MS);
  }, [enabled, onTimeout, toast]);

  useEffect(() => {
    if (!enabled) return;

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((e) => window.addEventListener(e, resetTimers, { passive: true }));
    resetTimers();

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimers));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
    };
  }, [enabled, resetTimers]);
}
