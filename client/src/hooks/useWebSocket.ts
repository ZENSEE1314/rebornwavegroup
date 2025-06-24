import { useEffect, useRef, useCallback } from 'react';
import { queryClient } from '@/lib/queryClient';

export function useWebSocket(enabled: boolean = true) {
  // WebSocket disabled to prevent connection errors
  // Auto-refresh disabled per user request to improve performance
  
  return { connect: () => {}, disconnect: () => {} };
}