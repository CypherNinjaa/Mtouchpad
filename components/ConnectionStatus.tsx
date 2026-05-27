import { View, Text } from "react-native";
import { useConnectionStore } from "../store/connection";
import { useSettingsStore } from "../store/settings";
import { colors } from "../theme/colors";

export function ConnectionStatus() {
	const { status, latency } = useConnectionStore();
	const { darkMode } = useSettingsStore();

	const getStatusColor = () => {
		switch (status) {
			case "connected":
				return colors.quaternary; // Emerald green
			case "disconnected":
			case "error":
			case "auth_failed":
				return colors.secondary; // Hot pink / Red
			case "connecting":
			default:
				return colors.tertiary; // Amber
		}
	};

	const getStatusText = () => {
		switch (status) {
			case "connected":
				return latency !== null ? `${latency}ms` : "Connected";
			case "disconnected":
				return "Disconnected - Reconnecting...";
			case "error":
			case "auth_failed":
				return "Connection Error";
			case "connecting":
				return "Connecting...";
			default:
				return "Unknown Status";
		}
	};

	const textColor = darkMode ? "white" : colors.foreground;
	const bgColor = darkMode ? "#1E293B" : colors.card;

	return (
		<View
			className="absolute top-12 self-center flex-row items-center px-4 py-2 rounded-full shadow-sm"
			style={{ backgroundColor: bgColor }}
		>
			<View
				className="w-2.5 h-2.5 rounded-full mr-2"
				style={{ backgroundColor: getStatusColor() }}
			/>
			<Text className="font-plus-medium text-sm" style={{ color: textColor }}>
				{getStatusText()}
			</Text>
		</View>
	);
}
