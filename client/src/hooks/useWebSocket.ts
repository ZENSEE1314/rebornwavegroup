import { useEffect, useRef, useCallback } from 'react';
import { queryClient } from '@/lib/queryClient';

export function useWebSocket(enabled: boolean = true) {
  // WebSocket disabled to prevent connection errors
  // Using periodic refresh instead for real-time updates
  useEffect(() => {
    if (!enabled) return;

    const refreshInterval = setInterval(() => {
      // Refresh pet data and user stats every 10 seconds
      queryClient.invalidateQueries({ queryKey: ['/api/pets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user-stats'] });
    }, 10000);

    return () => {
      clearInterval(refreshInterval);
    };
  }, [enabled]);

  return { connect: () => {}, disconnect: () => {} };
}