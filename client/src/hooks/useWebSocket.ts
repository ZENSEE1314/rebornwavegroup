import { useEffect, useRef, useCallback } from 'react';
import { queryClient } from '@/lib/queryClient';

export function useWebSocket(enabled: boolean = true) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!enabled || wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected for real-time updates');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Helper function to safely invalidate queries
          const safeInvalidateQueries = (predicateFn: (query: any) => boolean, errorContext: string) => {
            try {
              queryClient.invalidateQueries({ 
                predicate: (query) => {
                  try {
                    return predicateFn(query);
                  } catch (error) {
                    console.warn(`Query predicate error (${errorContext}):`, error);
                    return false;
                  }
                }
              }).catch((error) => {
                console.warn(`Query invalidation error (${errorContext}):`, error);
              });
            } catch (error) {
              console.warn(`Safe invalidation error (${errorContext}):`, error);
            }
          };
          
          if (data.type === 'PAYMENT_VERIFICATION_UPDATE') {
            console.log('Received payment verification update:', data.data);
            
            safeInvalidateQueries((query) => {
              const queryKey = query.queryKey[0] as string;
              return queryKey?.includes('/api/admin/payment-verifications') ||
                     queryKey?.includes('/api/payment-verifications') ||
                     queryKey?.includes('/api/user-stats') ||
                     queryKey?.includes('/api/points-history') ||
                     queryKey?.includes('/api/admin/commission-stats');
            }, 'payment');
            
            // Show notification based on status
            if (data.data.status === 'approved' && data.data.pointsAwarded > 0) {
              // Points awarded notification will be handled by the UI
              console.log(`Payment approved: ${data.data.pointsAwarded} points awarded`);
            }
          }
          
          // Handle appointment events for real-time admin updates
          if (data.type === 'appointment_created' || data.type === 'appointment_updated' || data.type === 'appointment_status_changed') {
            console.log('Received appointment update:', data.type, data.data);
            
            safeInvalidateQueries((query) => {
              const queryKey = query.queryKey[0] as string;
              return queryKey?.includes('/api/admin/appointments') ||
                     queryKey?.includes('/api/appointments') ||
                     queryKey?.includes('/api/user-stats');
            }, 'appointment');
          }
          
          // Handle pet energy updates for real-time sleep energy system
          if (data.type === 'PET_ENERGY_UPDATE') {
            console.log('Received pet energy update:', data.data);
            
            safeInvalidateQueries((query) => {
              const queryKey = query.queryKey[0] as string;
              return queryKey?.includes('/api/pets') ||
                     queryKey?.includes('/api/pets/') ||
                     queryKey?.includes('sleep-progress');
            }, 'pet-energy');
          }

          // Handle marketplace updates for real-time listing generation
          if (data.type === 'MARKETPLACE_UPDATED') {
            console.log('Received marketplace update:', data.data);
            
            safeInvalidateQueries((query) => {
              const queryKey = query.queryKey[0] as string;
              return queryKey?.includes('/api/listings') ||
                     queryKey?.includes('/api/admin/all-toys');
            }, 'marketplace');
          }

          // Handle user data updates for real-time admin user editing
          if (data.type === 'USER_DATA_UPDATED') {
            console.log('Received user data update:', data.userData);
            
            safeInvalidateQueries((query) => {
              const queryKey = query.queryKey[0] as string;
              return queryKey?.includes('/api/admin/users') ||
                     queryKey?.includes('/api/user-stats') ||
                     queryKey?.includes('/api/auth/user');
            }, 'user-data');
          }

          // Handle token claim updates for real-time token system
          if (data.type === 'TOKEN_CLAIM_CREATED') {
            console.log('Received token claim update:', data.claim);
            
            safeInvalidateQueries((query) => {
              const queryKey = query.queryKey[0] as string;
              return queryKey?.includes('/api/tokens/history') ||
                     queryKey?.includes('/api/token-claims') ||
                     queryKey?.includes('/api/admin/token-claims') ||
                     queryKey?.includes('/api/admin/token-transactions') ||
                     queryKey?.includes('/api/user-stats') ||
                     queryKey?.includes('/api/auth/user');
            }, 'token-claim-created');
          }

          // Handle token claim approval for real-time admin updates
          if (data.type === 'TOKEN_CLAIM_UPDATED') {
            console.log('Received token claim approval update:', data.data);
            
            safeInvalidateQueries((query) => {
              const queryKey = query.queryKey[0] as string;
              return queryKey?.includes('/api/admin/token-claims') ||
                     queryKey?.includes('/api/admin/token-transactions') ||
                     queryKey?.includes('/api/tokens/history') ||
                     queryKey?.includes('/api/user-stats') ||
                     queryKey?.includes('/api/admin/all-users');
            }, 'token-claim-updated');
            
            // Force immediate refetch for real-time UI updates
            try {
              queryClient.refetchQueries({ queryKey: ['/api/admin/token-transactions'] }).catch((error) => {
                console.warn('Query refetch error:', error);
              });
              queryClient.removeQueries({ queryKey: ['/api/admin/token-transactions'] });
            } catch (error) {
              console.warn('Token query management error:', error);
            }
          }

          // Handle season updates for real-time marketplace visibility changes
          if (data.type === 'SEASON_UPDATED' || data.type === 'SEASON_CREATED' || data.type === 'SEASON_DELETED') {
            console.log('Received season update:', data.type, data.data);
            
            safeInvalidateQueries((query) => {
              const queryKey = query.queryKey[0] as string;
              return queryKey?.includes('/api/admin/seasons') ||
                     queryKey?.includes('/api/seasons') ||
                     queryKey?.includes('/api/listings');
            }, 'season');
          }

          // Handle admin log updates for real-time admin dashboard
          if (data.type === 'ADMIN_LOG_CREATED') {
            console.log('Received admin log update:', data.logData);
            
            safeInvalidateQueries((query) => {
              const queryKey = query.queryKey[0] as string;
              return queryKey?.includes('/api/admin/logs');
            }, 'admin-log');
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected, attempting to reconnect...');
        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        // Clear any existing reconnect timeout and try again
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(connect, 5000);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      // Schedule reconnect on connection failure
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(connect, 5000);
    }
  }, [enabled]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return { connect, disconnect };
}