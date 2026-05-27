// client/store/connection.ts
import { create } from "zustand";

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error"
  | "auth_failed";

interface ConnectionStore {
  // State
  status: ConnectionStatus;
  serverUrl: string | null;
  latency: number | null;
  retryCount: number;

  // Actions
  setStatus: (status: ConnectionStatus) => void;
  setServerUrl: (url: string | null) => void;
  setLatency: (ms: number | null) => void;
  incrementRetry: () => void;
  resetRetry: () => void;
}

export const useConnectionStore = create<ConnectionStore>((set) => ({
  // Initial state
  status: "idle",
  serverUrl: null,
  latency: null,
  retryCount: 0,

  // Actions
  setStatus: (status) => set({ status }),
  setServerUrl: (serverUrl) => set({ serverUrl }),
  setLatency: (latency) => set({ latency }),
  incrementRetry: () => set((state) => ({ retryCount: state.retryCount + 1 })),
  resetRetry: () => set({ retryCount: 0 }),
}));
