// client/app/index.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { router } from "expo-router";
import { GeometricBg } from "../components/ui/GeometricBg";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { useConnectionStore } from "../store/connection";
import { colors } from "../theme/colors";
import { WS_PORT } from "../lib/constants";

export default function ConnectScreen() {
  const [ip, setIp] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  const { setServerUrl, setStatus } = useConnectionStore();

  const handleConnect = () => {
    setError(null);

    // Basic validation
    const ipRegex = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/;
    const localRegex = /^localhost$/i;
    
    if (!ip) {
      setError("IP address is required");
      return;
    }
    
    if (!ipRegex.test(ip) && !localRegex.test(ip)) {
      setError("Please enter a valid IP address (e.g., 192.168.1.5)");
      return;
    }

    if (!code) {
      setError("6-digit access code is required");
      return;
    }

    if (code.length !== 6 || !/^\d+$/.test(code)) {
      setError("Access code must be exactly 6 digits");
      return;
    }

    // Construct WebSocket URL with auth query parameter
    const wsUrl = `ws://${ip}:${WS_PORT}?code=${code}`;
    
    // Save in Zustand and reset state
    setStatus("connecting");
    setServerUrl(wsUrl);
    
    // Navigate to touchpad screen
    router.push("/touchpad");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <GeometricBg />
      
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>PhonePad</Text>
          <Text style={styles.subtitle}>Connect to your laptop</Text>
        </View>

        <View style={styles.card}>
          <Input
            label="Laptop IP Address"
            placeholder="e.g. 192.168.1.15"
            value={ip}
            onChangeText={(text) => {
              setIp(text.trim());
              setError(null);
            }}
            keyboardType="numeric"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Input
            label="6-Digit Access Code"
            placeholder="e.g. 123456"
            value={code}
            onChangeText={(text) => {
              setCode(text.trim());
              setError(null);
            }}
            keyboardType="number-pad"
            maxLength={6}
            secureTextEntry={false}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.buttonWrapper}>
            <Button label="Connect" onPress={handleConnect} />
          </View>
        </View>
        
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionTitle}>How to connect:</Text>
          <Text style={styles.instructionStep}>1. Start the PhonePad app on your laptop.</Text>
          <Text style={styles.instructionStep}>2. Note down the IP Address and 6-digit Code shown on the laptop.</Text>
          <Text style={styles.instructionStep}>3. Enter them above and tap Connect!</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontFamily: "Outfit_700Bold",
    fontSize: 40,
    color: colors.foreground,
    lineHeight: 48,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 16,
    color: colors.mutedFg,
    marginTop: 8,
    textAlign: "center",
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.foreground,
    borderRadius: 16,
    padding: 24,
    shadowColor: colors.foreground,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  buttonWrapper: {
    marginTop: 16,
  },
  errorText: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 14,
    color: colors.secondary,
    marginVertical: 8,
    textAlign: "center",
  },
  instructionsContainer: {
    marginTop: 32,
    backgroundColor: "rgba(30, 41, 59, 0.03)",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  instructionTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 14,
    color: colors.foreground,
    marginBottom: 8,
  },
  instructionStep: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 13,
    color: colors.mutedFg,
    lineHeight: 18,
    marginVertical: 2,
  },
});
