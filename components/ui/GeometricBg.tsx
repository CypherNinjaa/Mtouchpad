// client/components/ui/GeometricBg.tsx
import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Circle, Rect, Polygon } from "react-native-svg";
import { colors } from "../../theme/colors";

export function GeometricBg() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Circle top right */}
      <Svg style={styles.circle} width="160" height="160" viewBox="0 0 160 160">
        <Circle cx="80" cy="80" r="80" fill={colors.tertiary} opacity="0.25" />
      </Svg>
      
      {/* Rotated Rect bottom left */}
      <Svg style={styles.rect} width="150" height="150" viewBox="0 0 150 150">
        <Rect
          x="25"
          y="25"
          width="100"
          height="100"
          rx="16"
          fill={colors.accent}
          opacity="0.12"
          transform="rotate(20 75 75)"
        />
      </Svg>
      
      {/* Triangle middle right */}
      <Svg style={styles.triangle} width="80" height="40" viewBox="0 0 80 40">
        <Polygon points="0,40 40,0 80,40" fill={colors.quaternary} opacity="0.2" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    position: "absolute",
    top: -20,
    right: -20,
  },
  rect: {
    position: "absolute",
    bottom: 80,
    left: -30,
  },
  triangle: {
    position: "absolute",
    top: 200,
    right: 20,
  },
});
