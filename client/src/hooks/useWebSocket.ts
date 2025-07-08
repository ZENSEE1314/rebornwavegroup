import { useEffect, useRef, useCallback } from 'react';
import { queryClient } from '@/lib/queryClient';

export function useWebSocket(enabled: boolean = true) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef<number>(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    // Disable WebSocket completely in development environments
    if (!enabled || 
        window.location.hostname.includes('janeway.replit.dev') ||
        window.location.hostname.includes('replit.dev') ||
        window.location.port === '3000' ||
        process.env.NODE_ENV === 'development') {
      console.log('WebSocket disabled in development environment');
      return;
    }
    
    // Prevent multiple connections
    if (wsRef.current?.readyState === WebSocket.OPEN || 
        wsRef.current?.readyState === WebSocket.CONNECTING) {

      return;
    }
    
    // Clean up any existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      
      // Robust WebSocket URL construction for Replit environment
      let wsUrl: string;
      
      // Check if we're in Replit environment (janeway.replit.dev URLs)
      if (window.location.hostname.includes('replit.dev')) {
        // Use the same host as the current page for Replit
        wsUrl = `${protocol}//${window.location.host}/ws`;
      } else {
        // For local development or other environments
        const currentHost = window.location.host;
        if (!currentHost || currentHost.includes('undefined')) {
          // Fallback for undefined host scenarios
          wsUrl = `${protocol}//localhost:5000/ws`;
        } else {
          wsUrl = `${protocol}//${currentHost}/ws`;
        }
      }
      
      console.log('WebSocket connecting to:', wsUrl);
      
      // Create WebSocket with additional error handling
      try {
        wsRef.current = new WebSocket(wsUrl);
      } catch (wsError) {
        console.warn('WebSocket constructor error:', wsError);
        throw wsError;
      }

      wsRef.current.onopen = () => {

        reconnectAttempts.current = 0; // Reset reconnection attempts on successful connection
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

            }
          }
          
          // Handle appointment events for real-time admin updates
          if (data.type === 'appointment_created' || data.type === 'appointment_updated' || data.type === 'appointment_status_changed') {

            
            safeInvalidateQueries((query) => {
              const queryKey = query.queryKey[0] as string;
              return queryKey?.includes('/api/admin/appointments') ||
                     queryKey?.includes('/api/appointments') ||
                     queryKey?.includes('/api/user-stats');
            }, 'appointment');
          }
          
          // Handle pet energy updates for real-time sleep energy system
          if (data.type === 'PET_ENERGY_UPDATE') {

            
            safeInvalidateQueries((query) => {
              const queryKey = query.queryKey[0] as string;
              return queryKey?.includes('/api/pets') ||
                     queryKey?.includes('/api/pets/') ||
                     queryKey?.includes('sleep-progress');
            }, 'pet-energy');
          }

          // Handle marketplace updates for real-time listing generation
          if (data.type === 'MARKETPLACE_UPDATED') {

            
            safeInvalidateQueries((query) => {
              const queryKey = query.queryKey[0] as string;
              return queryKey?.includes('/api/listings') ||
                     queryKey?.includes('/api/admin/all-toys');
            }, 'marketplace');
          }

          // Handle user data updates for real-time admin user editing
          if (data.type === 'USER_DATA_UPDATED') {

            
            safeInvalidateQueries((query) => {
              const queryKey = query.queryKey[0] as string;
              return queryKey?.includes('/api/admin/users') ||
                     queryKey?.includes('/api/user-stats') ||
                     queryKey?.includes('/api/auth/user');
            }, 'user-data');
          }

          // Handle token claim updates for real-time token system
          if (data.type === 'TOKEN_CLAIM_CREATED') {

            
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

            
            safeInvalidateQueries((query) => {
              const queryKey = query.queryKey[0] as string;
              return queryKey?.includes('/api/admin/seasons') ||
                     queryKey?.includes('/api/seasons') ||
                     queryKey?.includes('/api/listings');
            }, 'season');
          }

          // Handle admin log updates for real-time admin dashboard
          if (data.type === 'ADMIN_LOG_CREATED') {

            
            safeInvalidateQueries((query) => {
              const queryKey = query.queryKey[0] as string;
              return queryKey?.includes('/api/admin/logs');
            }, 'admin-log');
          }

          // Handle banner updates for real-time banner management
          if (data.type === 'BANNER_CREATED' || data.type === 'BANNER_UPDATED' || data.type === 'BANNER_DELETED') {

            
            safeInvalidateQueries((query) => {
              const queryKey = query.queryKey[0] as string;
              return queryKey?.includes('/api/admin/banners') ||
                     queryKey?.includes('/api/promotion-banners');
            }, 'banner');
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        // Only reconnect if not manually closed
        if (event.code !== 1000 && enabled) {
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        }
      };

      wsRef.current.onerror = (error) => {
        console.warn('WebSocket error (suppressed):', error);
        // Clear any existing reconnect timeout and try again
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        if (enabled) {
          reconnectTimeoutRef.current = setTimeout(connect, 5000);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      // Schedule reconnect with exponential backoff
      if (reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000); // Max 30 seconds
        
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        

        reconnectTimeoutRef.current = setTimeout(connect, delay);
      } else {
        console.warn('WebSocket max reconnection attempts reached, stopping reconnection');
      }
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