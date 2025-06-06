import { useEffect, useRef, useCallback } from 'react';
import { queryClient } from '@/lib/queryClient';

export function useWebSocket(enabled = true) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!enabled || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      
      // Validate host before attempting connection
      if (!host || host.includes('undefined') || host === 'localhost:undefined') {
        console.warn('WebSocket connection skipped: Invalid host detected');
        return;
      }
      
      const wsUrl = `${protocol}//${host}/ws`;
      
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

      ws.onerror = (error) => {
        console.warn('WebSocket connection failed, continuing without real-time updates');
        wsRef.current = null;
      };
      
    } catch (error) {
      console.warn('WebSocket unavailable, using standard polling fallback');
      wsRef.current = null;
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