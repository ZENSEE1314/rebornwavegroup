import { useEffect, useRef, useCallback } from 'react';
import { queryClient } from '@/lib/queryClient';

export function useWebSocket(enabled: boolean = true) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;

  const connect = useCallback(() => {
    // Skip if disabled or already connected
    if (!enabled || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // Only connect for admin users in valid environments
    if (typeof window === 'undefined') {
      return;
    }

    const currentHost = window.location.host;
    const currentProtocol = window.location.protocol;
    
    // Strict environment validation
    if (!currentHost || 
        currentHost.includes('undefined') || 
        currentHost === 'localhost:undefined' ||
        !currentHost.includes(':')) {
      return;
    }

    const hostParts = currentHost.split(':');
    if (hostParts.length !== 2) {
      return;
    }

    const hostname = hostParts[0];
    const port = hostParts[1];
    
    if (!hostname || !port || port === 'undefined' || isNaN(Number(port))) {
      return;
    }

    const numericPort = Number(port);
    if (numericPort < 1000 || numericPort > 65535) {
      return;
    }

    try {
      const protocol = currentProtocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${currentHost}/ws`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        reconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle admin updates and invalidate appropriate cache keys
          if (data.type === 'admin-update') {
            switch (data.event) {
              case 'payment-verification-updated':
                queryClient.invalidateQueries({ queryKey: ['/api/admin/payment-verifications'] });
                queryClient.invalidateQueries({ queryKey: ['/api/admin/commission-stats'] });
                break;
              case 'cash-out-updated':
                queryClient.invalidateQueries({ queryKey: ['/api/admin/cash-outs'] });
                break;
              case 'topup-request-updated':
                queryClient.invalidateQueries({ queryKey: ['/api/admin/topup-requests'] });
                break;
              case 'token-claim-updated':
                queryClient.invalidateQueries({ queryKey: ['/api/admin/token-claims'] });
                break;
            }
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        wsRef.current = null;
        
        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.pow(2, reconnectAttempts.current) * 1000;
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        }
      };

      ws.onerror = () => {
        // Silent failure - continue without real-time updates
        wsRef.current = null;
        reconnectAttempts.current = maxReconnectAttempts; // Stop reconnection attempts
      };
      
    } catch {
      // Silent failure - WebSocket unavailable
      wsRef.current = null;
      reconnectAttempts.current = maxReconnectAttempts; // Stop reconnection attempts
    }
  }, [enabled]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return { connect, disconnect };
}