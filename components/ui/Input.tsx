// client/components/ui/Input.tsx
import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, TextInputProps } from "react-native";
import { colors } from "../../theme/colors";

interface InputProps extends TextInputProps {
  label: string;
  helperText?: string;
}

export function Input({ label, helperText, ...props }: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      
      <View
        style={[
          styles.inputWrapper,
          {
            borderColor: isFocused ? colors.accent : "#CBD5E1",
            shadowColor: colors.accent,
            shadowOffset: isFocused ? { width: 4, height: 4 } : { width: 0, height: 0 },
            shadowOpacity: isFocused ? 1 : 0,
            elevation: isFocused ? 2 : 0,
          },
        ]}
      >
        <TextInput
          style={styles.textInput}
          placeholderTextColor="#94A3B8"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
      </View>
      
      {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    width: "100%",
  },
  label: {
    fontFamily: "Outfit_700Bold",
    fontSize: 12,
    color: colors.foreground,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 6,
    paddingLeft: 4,
  },
  inputWrapper: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 48,
    justifyContent: "center",
    shadowRadius: 0, // Flat shadow
  },
  textInput: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 16,
    color: colors.foreground,
    height: "100%",
    padding: 0,
  },
  helper: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: colors.mutedFg,
    marginTop: 4,
    paddingLeft: 4,
  },
});
