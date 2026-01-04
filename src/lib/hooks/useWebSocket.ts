'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useGlobal } from '@/context/GlobalContext';

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface WebSocketMessage {
    type: 'TASK_UPDATE' | 'PING' | 'PONG';
    payload?: {
        taskId: string;
        status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
        taskType: string;
        result?: unknown;
    };
}

interface UseWebSocketReturn {
    lastMessage: WebSocketMessage | null;
    status: WebSocketStatus;
    send: (message: WebSocketMessage) => void;
}

/**
 * Hook for managing WebSocket connection with automatic reconnection.
 * Connects when logged in, disconnects when not.
 */
export function useWebSocket(): UseWebSocketReturn {
    const { isLoggedIn } = useGlobal();
    const [status, setStatus] = useState<WebSocketStatus>('disconnected');
    const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectAttemptRef = useRef(0);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const maxReconnectAttempts = 10;
    const baseReconnectDelay = 1000; // 1 second
    const maxReconnectDelay = 30000; // 30 seconds

    const getWebSocketUrl = useCallback(() => {
        const token = localStorage.getItem('token');
        if (!token) return null;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        return `${protocol}//${host}/api/ws?token=${encodeURIComponent(token)}`;
    }, []);

    const connectRef = useRef<() => void>(() => { });

    const connect = useCallback(() => {

        if (wsRef.current?.readyState === WebSocket.OPEN) {
            return;
        }

        const url = getWebSocketUrl();
        if (!url) {
            setStatus('disconnected');
            return;
        }

        setStatus('connecting');

        try {
            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => {
                setStatus('connected');
                reconnectAttemptRef.current = 0;
                console.log('[WebSocket] Connected');
            };

            ws.onmessage = (event) => {
                try {
                    const message: WebSocketMessage = JSON.parse(event.data);
                    console.log('[WebSocket] Message received:', message.type);
                    setLastMessage(message);
                } catch (e) {
                    console.error('[WebSocket] Failed to parse message:', e);
                }
            };

            ws.onerror = (error) => {
                console.error('[WebSocket] Error:', error);
                setStatus('error');
            };

            ws.onclose = (event) => {
                console.log('[WebSocket] Disconnected:', event.code, event.reason);
                setStatus('disconnected');
                wsRef.current = null;

                // Attempt reconnection with exponential backoff
                if (isLoggedIn && reconnectAttemptRef.current < maxReconnectAttempts) {
                    const delay = Math.min(
                        baseReconnectDelay * Math.pow(2, reconnectAttemptRef.current),
                        maxReconnectDelay
                    );
                    reconnectAttemptRef.current++;
                    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptRef.current})`);

                    reconnectTimeoutRef.current = setTimeout(() => {
                        if (isLoggedIn) {
                            // Use the ref to call connect to avoid "variable used before declaration"
                            connectRef.current();
                        }
                    }, delay);
                }
            };
        } catch (error) {
            console.error('[WebSocket] Failed to connect:', error);
            setStatus('error');
        }
    }, [getWebSocketUrl, isLoggedIn]);

    // Update the ref whenever connect changes
    useEffect(() => {
        connectRef.current = connect;
    }, [connect]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (wsRef.current) {
            wsRef.current.close(1000, 'User logout');
            wsRef.current = null;
        }

        setStatus('disconnected');
        reconnectAttemptRef.current = 0;
    }, []);

    const send = useCallback((message: WebSocketMessage) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
        }
    }, []);

    // Connect when logged in, disconnect when not
    useEffect(() => {
        if (isLoggedIn) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            connect();
        } else {
            disconnect();
        }

        return () => {
            disconnect();
        };
    }, [isLoggedIn, connect, disconnect]);

    // Reconnect when token changes (e.g., after refresh)
    useEffect(() => {
        const handleTokenChange = () => {
            if (isLoggedIn && status === 'connected') {
                // Token might have been refreshed, reconnect with new token
                disconnect();
                connect();
            }
        };

        window.addEventListener('storage', handleTokenChange);
        return () => window.removeEventListener('storage', handleTokenChange);
    }, [isLoggedIn, status, connect, disconnect]);

    return { lastMessage, status, send };
}
