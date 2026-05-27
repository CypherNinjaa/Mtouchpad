// client/components/ui/Button.tsx
import React, { useRef } from "react";
import { Pressable, Text, Animated, StyleSheet, GestureResponderEvent } from "react-native";
import { colors } from "../../theme/colors";
import { hardShadow } from "../../theme/shadows";

interface ButtonProps {
  label: string;
  onPress: (event: GestureResponderEvent) => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  icon?: React.ReactNode;
}

export function Button({ label, onPress, variant = "primary", disabled = false, icon }: ButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    if (disabled) return;
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const onPressOut = () => {
    if (disabled) return;
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 6,
    }).start();
  };

  const isPrimary = variant === "primary";

  return (
    <Animated.View style={[styles.container, { transform: [{ scale }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: isPrimary ? colors.accent : "transparent",
            borderColor: colors.foreground,
            opacity: disabled ? 0.5 : 1,
          },
          !disabled && (pressed ? hardShadow.popSm : hardShadow.pop),
          !disabled && pressed && styles.buttonPressed,
        ]}
      >
        {icon}
        <Text
          style={[
            styles.text,
            { color: isPrimary ? colors.background : colors.foreground },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  button: {
    borderWidth: 2,
    borderRadius: 9999, // Pill shape
    paddingHorizontal: 24,
    paddingVertical: 14,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  buttonPressed: {
    transform: [{ translateX: 2 }, { translateY: 2 }],
  },
  text: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
  },
});
