// client/components/TouchSurface.tsx
import React from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import { colors } from "../theme/colors";
import { hardShadow } from "../theme/shadows";

import { useGestures } from "../hooks/useGestures";

interface TouchSurfaceProps {
  send: (event: any) => void;
  style?: StyleProp<ViewStyle>;
}

export function TouchSurface({ send, style }: TouchSurfaceProps) {
  const gestureLayout = useGestures(send);

  return (
    <GestureDetector gesture={gestureLayout}>
      {/* collapsable={false} ensures Android creates a real native view
          for gesture recognition instead of optimizing it away */}
      <View style={[styles.surface, style]} collapsable={false} />
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  surface: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.foreground,
    borderRadius: 16,
    margin: 16,
    ...hardShadow.card,
  },
});
