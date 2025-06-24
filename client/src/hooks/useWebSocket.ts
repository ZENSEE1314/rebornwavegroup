import { useEffect, useRef, useCallback } from 'react';
import { queryClient } from '@/lib/queryClient';

export function useWebSocket(enabled: boolean = true) {
  // WebSocket disabled to prevent connection errors
  // Using reasonable refresh interval for pet updates
  useEffect(() => {
    if (!enabled) return;

    const refreshInterval = setInterval(() => {
      // Refresh pet data and user stats every 5 minutes
      queryClient.invalidateQueries({ queryKey: ['/api/pets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user-stats'] });
    }, 300000); // 5 minutes instead of 10 seconds

    return () => {
      clearInterval(refreshInterval);
    };
  }, [enabled]);

  return { connect: () => {}, disconnect: () => {} };
}