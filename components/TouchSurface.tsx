// client/components/TouchSurface.tsx
import React from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { Events } from "../lib/events";
import { colors } from "../theme/colors";
import { hardShadow } from "../theme/shadows";

interface TouchSurfaceProps {
  send: (event: any) => void;
  style?: StyleProp<ViewStyle>;
}

export function TouchSurface({ send, style }: TouchSurfaceProps) {
  const lastTranslation = React.useRef({ x: 0, y: 0 });

  // Track pan movement for relative cursor positioning
  const panGesture = Gesture.Pan()
    .minPointers(1)
    .maxPointers(1)
    .onStart(() => {
      lastTranslation.current = { x: 0, y: 0 };
    })
    .onUpdate((e) => {
      const dx = e.translationX - lastTranslation.current.x;
      const dy = e.translationY - lastTranslation.current.y;
      lastTranslation.current = { x: e.translationX, y: e.translationY };
      
      // Send raw delta updates; the server applies acceleration & sensitivity.
      send(Events.move(dx, dy));
    });

  // Single tap maps to left mouse click
  const tapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      // Trigger light haptic bump
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      send(Events.click("left"));
    });

  // Compose gestures. Run both simultaneously or in race.
  // Tap should fire if no pan drag occurs.
  const composedGesture = Gesture.Exclusive(panGesture, tapGesture);

  return (
    <GestureDetector gesture={composedGesture}>
      <View style={[styles.surface, style]} />
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
