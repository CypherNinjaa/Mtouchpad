// client/components/TouchSurface.tsx
import React from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import { colors } from "../theme/colors";
import { hardShadow } from "../theme/shadows";
import { useSettingsStore } from "../store/settings";

import { useGestures } from "../hooks/useGestures";

interface TouchSurfaceProps {
	send: (event: any) => void;
	style?: StyleProp<ViewStyle>;
}

export function TouchSurface({ send, style }: TouchSurfaceProps) {
	const gestureLayout = useGestures(send);
	const { darkMode } = useSettingsStore();

	return (
		<GestureDetector gesture={gestureLayout}>
			{/* collapsable={false} ensures Android creates a real native view
          for gesture recognition instead of optimizing it away */}
			<View
				style={[
					styles.surface,
					style,
					{
						backgroundColor: darkMode ? "#1E293B" : colors.card,
						borderColor: darkMode ? "#475569" : colors.foreground,
						shadowColor: darkMode ? "#0F172A" : colors.foreground,
					},
				]}
				collapsable={false}
			/>
		</GestureDetector>
	);
}

const styles = StyleSheet.create({
	surface: {
		borderWidth: 2,
		borderRadius: 24, // Matches the "large" varied radii vibe
		margin: 16,
		...hardShadow.card,
	},
});
