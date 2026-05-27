// client/app/touchpad.tsx
import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, Keyboard } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { useWebSocket } from "../hooks/useWebSocket";
import { useConnectionStore } from "../store/connection";
import { TouchSurface } from "../components/TouchSurface";
import { GeometricBg } from "../components/ui/GeometricBg";
import { colors } from "../theme/colors";
import { Events } from "../lib/events";

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

  const inputRef = useRef<TextInput>(null);
  const [isKeyboardActive, setIsKeyboardActive] = useState(false);
  const [text, setText] = useState("");
  const prevText = useRef("");

  // Sync keyboard status with actual OS keyboard visibility
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => {
      setIsKeyboardActive(true);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setIsKeyboardActive(false);
      // Clear the text box state when keyboard dismisses
      setText("");
      prevText.current = "";
      inputRef.current?.blur();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Redirect to connect screen if serverUrl is unset
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

  const toggleKeyboard = () => {
    if (isKeyboardActive) {
      inputRef.current?.blur();
      setIsKeyboardActive(false);
    } else {
      inputRef.current?.focus();
      setIsKeyboardActive(true);
    }
  };

  const handleTextChange = (newText: string) => {
    const prev = prevText.current;
    if (newText === prev) return;

    if (newText.startsWith(prev)) {
      // User appended text (typed characters or accepted suggestion)
      const added = newText.slice(prev.length);
      if (added) {
        send(Events.text(added));
      }
    } else if (prev.startsWith(newText)) {
      // User deleted characters from the end (backspaces)
      const deletedCount = prev.length - newText.length;
      for (let i = 0; i < deletedCount; i++) {
        send(Events.key("backspace"));
      }
    } else {
      // Autocorrect replacement or complex edit -> clear old word, send new
      for (let i = 0; i < prev.length; i++) {
        send(Events.key("backspace"));
      }
      if (newText) {
        send(Events.text(newText));
      }
    }

    setText(newText);
    prevText.current = newText;
  };

  const handleKeyPress = ({ nativeEvent }: { nativeEvent: { key: string } }) => {
    if (nativeEvent.key === "Backspace") {
      // Fallback for empty backspaces
      if (text.length === 0) {
        send(Events.key("backspace"));
      }
    } else if (nativeEvent.key === "Enter") {
      send(Events.key("enter"));
    }
  };

  const handleMediaPress = (action: "play_pause" | "next" | "prev" | "vol_up" | "vol_down" | "mute") => {
    send(Events.media(action));
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

          {/* Floating Text Input Box - only visible when typing */}
          <View style={[styles.keyboardTextBox, !isKeyboardActive && styles.hiddenInputContainer]}>
            <Text style={styles.keyboardTextLabel}>Remote Typing:</Text>
            <TextInput
              ref={inputRef}
              style={styles.keyboardInput}
              value={text}
              onChangeText={handleTextChange}
              onKeyPress={handleKeyPress}
              placeholder="Type here to send..."
              placeholderTextColor={colors.mutedFg}
              autoCapitalize="none"
              autoCorrect={true}
              blurOnSubmit={false}
            />
          </View>
        </View>

        {/* Playful Geometric Control Panel */}
        <View style={styles.controlPanel}>
          {/* Keyboard Toggle */}
          <Pressable 
            style={[
              styles.controlButton, 
              { backgroundColor: isKeyboardActive ? colors.accent : colors.card }
            ]}
            onPress={toggleKeyboard}
          >
            <MaterialIcons 
              name="keyboard" 
              size={20} 
              color={isKeyboardActive ? "#FFF" : colors.foreground} 
            />
          </Pressable>
          
          <View style={styles.controlDivider} />
          
          {/* Media Controls using clean Vector Icons */}
          <View style={styles.mediaContainer}>
            <Pressable style={styles.mediaButton} onPress={() => handleMediaPress("prev")}>
              <Feather name="skip-back" size={18} color={colors.foreground} />
            </Pressable>
            <Pressable style={styles.mediaButton} onPress={() => handleMediaPress("play_pause")}>
              <Feather name="play" size={18} color={colors.foreground} />
            </Pressable>
            <Pressable style={styles.mediaButton} onPress={() => handleMediaPress("next")}>
              <Feather name="skip-forward" size={18} color={colors.foreground} />
            </Pressable>
            <Pressable style={styles.mediaButton} onPress={() => handleMediaPress("vol_down")}>
              <Feather name="volume-1" size={18} color={colors.foreground} />
            </Pressable>
            <Pressable style={styles.mediaButton} onPress={() => handleMediaPress("vol_up")}>
              <Feather name="volume-2" size={18} color={colors.foreground} />
            </Pressable>
            <Pressable style={styles.mediaButton} onPress={() => handleMediaPress("mute")}>
              <Feather name="volume-x" size={18} color={colors.foreground} />
            </Pressable>
          </View>
        </View>

        {/* Footer gesture hints */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            1 Finger: Drag → Move  •  Tap → Click  •  Hold → Right Click
          </Text>
          <Text style={styles.footerText}>
            2 Fingers: Drag → Scroll  •  Tap → Right Click  •  Pinch → Zoom
          </Text>
          <Text style={styles.footerText}>
            3 Fingers: Swipe → Switch App  •  4 Fingers: Swipe → Virtual Desktop
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
    position: "relative",
  },
  touchSurface: {
    flex: 1,
    margin: 0,
    marginTop: 16,
    marginBottom: 16,
  },
  keyboardTextBox: {
    position: "absolute",
    top: 32,
    left: 24,
    right: 24,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.foreground,
    borderRadius: 16,
    padding: 14,
    shadowColor: colors.foreground,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
    zIndex: 10,
  },
  hiddenInputContainer: {
    display: "none",
    width: 0,
    height: 0,
    opacity: 0,
  },
  keyboardTextLabel: {
    fontFamily: "Outfit_700Bold",
    fontSize: 12,
    color: colors.mutedFg,
    textTransform: "uppercase",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  keyboardInput: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 16,
    color: colors.foreground,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  controlPanel: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.foreground,
    borderRadius: 9999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginVertical: 12,
    justifyContent: "space-between",
    shadowColor: colors.foreground,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.foreground,
    alignItems: "center",
    justifyContent: "center",
  },
  controlDivider: {
    width: 2,
    height: 28,
    backgroundColor: colors.border,
    marginHorizontal: 12,
  },
  mediaContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  mediaButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    alignItems: "center",
    paddingBottom: 4,
    gap: 2,
  },
  footerText: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 11,
    color: colors.mutedFg,
    textAlign: "center",
    lineHeight: 16,
  },
});
