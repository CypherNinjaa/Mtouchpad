// client/app/index.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Modal, Pressable } from "react-native";
import { router } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { GeometricBg } from "../components/ui/GeometricBg";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { useConnectionStore } from "../store/connection";
import { colors } from "../theme/colors";
import { WS_PORT } from "../lib/constants";
import { parseQRPayload, buildWsUrl } from "../lib/pairing";

export default function ConnectScreen() {
  const [ip, setIp] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  const { setServerUrl, setStatus } = useConnectionStore();

  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

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
    const wsUrl = buildWsUrl(ip, WS_PORT, code);
    
    // Save in Zustand and reset state
    setStatus("connecting");
    setServerUrl(wsUrl);
    
    // Navigate to touchpad screen
    router.push("/touchpad");
  };

  const handleScanPress = async () => {
    setError(null);
    if (!permission) return;
    if (!permission.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        setError("Camera permission is required to scan QR code");
        return;
      }
    }
    setShowScanner(true);
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    // Avoid double trigger by immediately hiding scanner
    setShowScanner(false);
    const parsed = parseQRPayload(data);
    if (!parsed) {
      setError("Invalid QR code. Please scan the PhonePad pairing QR code.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }

    const { ip: targetIp, port, code: targetCode } = parsed;
    const wsUrl = buildWsUrl(targetIp, port, targetCode);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setStatus("connecting");
    setServerUrl(wsUrl);
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

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.buttonWrapper}>
            <Button
              label="Scan QR Code"
              onPress={handleScanPress}
              variant="secondary"
              icon={<Feather name="camera" size={20} color={colors.foreground} />}
            />
          </View>
        </View>
        
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionTitle}>How to connect:</Text>
          <Text style={styles.instructionStep}>1. Start the PhonePad app on your laptop.</Text>
          <Text style={styles.instructionStep}>2. Note down the IP Address and 6-digit Code shown on the laptop.</Text>
          <Text style={styles.instructionStep}>3. Enter them above or scan the generated QR code!</Text>
        </View>
      </ScrollView>

      {/* Camera QR Scanner Modal */}
      <Modal
        visible={showScanner}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowScanner(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.scannerCard}>
            {/* Header */}
            <View style={styles.scannerHeader}>
              <Text style={styles.scannerTitle}>Scan QR Code</Text>
              <Pressable
                style={styles.closeButton}
                onPress={() => setShowScanner(false)}
              >
                <Feather name="x" size={20} color={colors.foreground} />
              </Pressable>
            </View>

            {/* Camera viewport window */}
            <View style={styles.cameraContainer}>
              {showScanner && (
                <CameraView
                  style={styles.camera}
                  barcodeScannerSettings={{
                    barcodeTypes: ["qr"],
                  }}
                  onBarcodeScanned={handleBarCodeScanned}
                />
              )}
              {/* Guidelines target overlay */}
              <View style={styles.overlayContainer}>
                <View style={styles.scanTarget} />
              </View>
            </View>

            <Text style={styles.scannerHint}>
              Align the laptop pairing QR code inside the frame to scan.
            </Text>

            <View style={styles.cancelButtonWrapper}>
              <Button
                label="Cancel"
                onPress={() => setShowScanner(false)}
                variant="secondary"
              />
            </View>
          </View>
        </View>
      </Modal>
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
    marginTop: 8,
    marginBottom: 8,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12,
  },
  dividerLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 14,
    color: colors.mutedFg,
    paddingHorizontal: 12,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(30, 41, 59, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  scannerCard: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.foreground,
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    shadowColor: colors.foreground,
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  },
  scannerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
  },
  scannerTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 22,
    color: colors.foreground,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.foreground,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.foreground,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 1,
  },
  closeButtonText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    color: colors.foreground,
  },
  cameraContainer: {
    width: 280,
    height: 280,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.foreground,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  overlayContainer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  scanTarget: {
    width: 180,
    height: 180,
    borderWidth: 3,
    borderColor: colors.accent,
    borderRadius: 12,
    borderStyle: "dashed",
  },
  scannerHint: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 14,
    color: colors.mutedFg,
    textAlign: "center",
    marginTop: 16,
    marginBottom: 20,
    lineHeight: 20,
  },
  cancelButtonWrapper: {
    width: "100%",
  },
});
