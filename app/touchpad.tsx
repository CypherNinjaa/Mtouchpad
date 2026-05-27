// client/app/touchpad.tsx
import React, { useEffect } from "react";
import { View, Text, StyleSheet, Pressable, SafeAreaView } from "react-native";
import { router } from "expo-router";
import { useWebSocket } from "../hooks/useWebSocket";
import { useConnectionStore } from "../store/connection";
import { TouchSurface } from "../components/TouchSurface";
import { GeometricBg } from "../components/ui/GeometricBg";
import { colors } from "../theme/colors";

const STATUS_CONFIG = {
  idle: { color: colors.mutedFg, label: "Idle" },
  connecting: { color: colors.tertiary, label: "Connecting..." },
  connected: { color: colors.quaternary, label: "Connected" },
  disconnected: { color: colors.secondary, label: "Disconnected" },
  error: { color: "#EF4444", label: "Connection Error" },
  auth_failed: { color: colors.tertiary, label: "Authentication Failed" },
};

export default function TouchpadScreen() {
  const { send, disconnect } = useWebSocket();
  const { status, latency, serverUrl, setServerUrl } = useConnectionStore();
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.disconnected;

  // If no server URL is configured, force redirect to connect page
  useEffect(() => {
    if (!serverUrl) {
      router.replace("/");
    }
  }, [serverUrl]);

  const handleDisconnect = () => {
    disconnect();
    setServerUrl(null);
    router.replace("/");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GeometricBg />
      
      <View style={styles.container}>
        {/* Header Section */}
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={handleDisconnect}>
            <Text style={styles.backButtonText}>← Exit</Text>
          </Pressable>
          
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: cfg.color }]} />
            <Text style={styles.statusText}>
              {cfg.label}
              {status === "connected" && latency !== null ? ` • ${latency}ms` : ""}
            </Text>
          </View>
        </View>

        {/* Main Touch area */}
        <View style={styles.touchAreaContainer}>
          <TouchSurface send={send} style={styles.touchSurface} />
        </View>

        {/* Footer info helper */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Drag to move cursor • Tap to left click
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    marginBottom: 8,
  },
  backButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: colors.foreground,
    borderRadius: 9999,
    backgroundColor: colors.card,
    shadowColor: colors.foreground,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  backButtonText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 14,
    color: colors.foreground,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.foreground,
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: colors.foreground,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 13,
    color: colors.foreground,
  },
  touchAreaContainer: {
    flex: 1,
  },
  touchSurface: {
    flex: 1,
    margin: 0,
    marginTop: 16,
    marginBottom: 16,
  },
  footer: {
    alignItems: "center",
    paddingBottom: 8,
  },
  footerText: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 13,
    color: colors.mutedFg,
    textAlign: "center",
  },
});
