// client/hooks/useWebSocket.ts
import { useEffect, useRef, useCallback } from "react";
import { useConnectionStore } from "../store/connection";
import { BASE_DELAY, MAX_DELAY } from "../lib/constants";

export function useWebSocket() {
  const ws = useRef<WebSocket | null>(null);
  const {
    status,
    serverUrl,
    retryCount,
    setStatus,
    setLatency,
    incrementRetry,
    resetRetry,
  } = useConnectionStore();

  // Keep track of the latest values in refs to prevent dependency recreation
  const latestServerUrl = useRef<string | null>(null);
  useEffect(() => {
    latestServerUrl.current = serverUrl;
  }, [serverUrl]);

  const retryCountRef = useRef(retryCount);
  useEffect(() => {
    retryCountRef.current = retryCount;
  }, [retryCount]);

  const disconnect = useCallback(() => {
    if (ws.current) {
      ws.current.onopen = null;
      ws.current.onclose = null;
      ws.current.onerror = null;
      ws.current.onmessage = null;
      ws.current.close();
      ws.current = null;
    }
  }, []);

  const connect = useCallback((url: string) => {
    disconnect();
    
    setStatus("connecting");
    const socket = new WebSocket(url);
    ws.current = socket;

    socket.onopen = () => {
      setStatus("connected");
      resetRetry();
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "pong" && typeof message.latency === "number") {
          setLatency(message.latency);
        }
      } catch (err) {
        // Silently ignore invalid JSON
      }
    };

    socket.onerror = () => {
      setStatus("error");
    };

    socket.onclose = (e) => {
      // Don't retry if the connection was deliberately closed, auth failed, or rate-limited
      if (e.code === 4001 || e.code === 4003) {
        setStatus("auth_failed");
        return;
      }
      if (e.code === 4002) {
        setStatus("error"); // Or server full error representation
        return;
      }

      setStatus("disconnected");
      incrementRetry();
      
      // Calculate backoff delay using ref to avoid recreating callback
      const delay = Math.min(BASE_DELAY * Math.pow(1.5, retryCountRef.current), MAX_DELAY);
      
      setTimeout(() => {
        // Check if the serverUrl has changed in the meantime
        if (latestServerUrl.current === url) {
          connect(url);
        }
      }, delay);
    };
  }, [setStatus, resetRetry, setLatency, incrementRetry, disconnect]);

  const send = useCallback((event: object) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(event));
    }
  }, []);

  // Sync WebSocket connection with serverUrl store state changes
  useEffect(() => {
    if (serverUrl) {
      connect(serverUrl);
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [serverUrl, connect, disconnect]);

  return { connect, disconnect, send };
}
