import {
	View,
	Text,
	Switch,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { useSettingsStore } from "../store/settings";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import Slider from "@react-native-community/slider";

import { GeometricBg } from "../components/ui/GeometricBg";

function SettingSlider({
	label,
	value,
	min,
	max,
	onValueChange,
	darkMode,
}: any) {
	const textColor = darkMode ? "white" : colors.foreground;

	return (
		<View className="mb-6">
			<View className="flex-row justify-between items-center mb-4">
				<Text
					className="font-outfit-bold"
					style={{ fontSize: 16, color: textColor }}
				>
					{label}
				</Text>
				<View
					className="px-4 py-1.5 rounded-full border-2"
					style={{
						backgroundColor: darkMode ? "#1E293B" : colors.card,
						borderColor: darkMode ? "#475569" : colors.foreground,
						shadowColor: darkMode ? "#000" : colors.foreground,
						shadowOffset: { width: 2, height: 2 },
						shadowOpacity: 1,
						shadowRadius: 0,
						elevation: 2,
					}}
				>
					<Text
						className="font-plus-bold"
						style={{ color: textColor, fontSize: 14 }}
					>
						{value.toFixed(1)}
					</Text>
				</View>
			</View>
			<Slider
				style={{ width: "100%", height: 40 }}
				minimumValue={min}
				maximumValue={max}
				value={value}
				step={0.1}
				onValueChange={onValueChange}
				minimumTrackTintColor={colors.accent}
				maximumTrackTintColor={darkMode ? "#334155" : colors.border}
				thumbTintColor={darkMode ? "white" : colors.foreground}
			/>
		</View>
	);
}

function SettingSwitch({ label, value, onValueChange, darkMode }: any) {
	const textColor = darkMode ? "white" : colors.foreground;
	return (
		<View className="flex-row justify-between items-center mb-6 px-1">
			<Text
				className="font-outfit-bold"
				style={{ fontSize: 16, color: textColor }}
			>
				{label}
			</Text>
			<Switch
				value={value}
				onValueChange={onValueChange}
				trackColor={{
					false: darkMode ? "#334155" : colors.border,
					true: colors.accent,
				}}
				thumbColor={"#ffffff"}
				style={{ transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }] }}
			/>
		</View>
	);
}

export default function SettingsScreen() {
	const {
		sensitivity,
		setSensitivity,
		scrollSpeed,
		setScrollSpeed,
		leftHandMode,
		setLeftHandMode,
		darkMode,
		setDarkMode,
		reduceMotion,
		setReduceMotion,
		history,
	} = useSettingsStore();

	return (
		<SafeAreaView
			style={{
				flex: 1,
				backgroundColor: darkMode ? "#0F172A" : colors.background,
			}}
		>
			<GeometricBg opacity={darkMode ? 0.05 : 0.15} />
			<View
				className="flex-row items-center p-6 border-b-2"
				style={{
					borderColor: darkMode ? "#1E293B" : colors.border,
					backgroundColor: darkMode ? "#0F172A" : colors.background,
					zIndex: 10,
				}}
			>
				<TouchableOpacity
					className="mr-5 p-2 rounded-full border-2"
					style={{
						borderColor: darkMode ? "#475569" : colors.foreground,
						backgroundColor: darkMode ? "#1E293B" : colors.card,
						shadowColor: darkMode ? "#000" : colors.foreground,
						shadowOffset: { width: 3, height: 3 },
						shadowOpacity: 1,
						shadowRadius: 0,
						elevation: 2,
					}}
					onPress={() => router.back()}
				>
					<Ionicons
						name="arrow-back"
						size={24}
						color={darkMode ? "white" : colors.foreground}
					/>
				</TouchableOpacity>
				<Text
					className="font-outfit-bold text-3xl tracking-tight"
					style={{
						color: darkMode ? "white" : colors.foreground,
						textShadowColor: darkMode ? "rgba(0,0,0,0.5)" : "transparent",
						textShadowOffset: { width: 1, height: 1 },
						textShadowRadius: 1,
					}}
				>
					Settings
				</Text>
			</View>
			<ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60 }}>
				<View className="mb-2">
					<Text
						className="font-plus-bold tracking-widest text-xs uppercase mb-6"
						style={{ color: darkMode ? colors.secondary : colors.accent }}
					>
						Gestures & Control
					</Text>
				</View>

				<SettingSlider
					label="Sensitivity"
					value={sensitivity}
					min={0.5}
					max={3.0}
					onValueChange={setSensitivity}
					darkMode={darkMode}
				/>
				<SettingSlider
					label="Scroll Speed"
					value={scrollSpeed}
					min={0.5}
					max={3.0}
					onValueChange={setScrollSpeed}
					darkMode={darkMode}
				/>
				<SettingSwitch
					label="Left Hand Mode"
					value={leftHandMode}
					onValueChange={setLeftHandMode}
					darkMode={darkMode}
				/>

				<View
					className="h-1 rounded-full my-8 opacity-50"
					style={{ backgroundColor: darkMode ? "#1E293B" : colors.border }}
				/>

				<View className="mb-2">
					<Text
						className="font-plus-bold tracking-widest text-xs uppercase mb-6"
						style={{ color: darkMode ? colors.quaternary : colors.tertiary }}
					>
						Display & Accessibility
					</Text>
				</View>

				<SettingSwitch
					label="Dark Mode"
					value={darkMode}
					onValueChange={setDarkMode}
					darkMode={darkMode}
				/>
				<SettingSwitch
					label="Reduce Motion"
					value={reduceMotion}
					onValueChange={setReduceMotion}
					darkMode={darkMode}
				/>

				<View
					className="h-1 rounded-full my-8 opacity-50"
					style={{ backgroundColor: darkMode ? "#1E293B" : colors.border }}
				/>

				<View className="mb-2">
					<Text
						className="font-plus-bold tracking-widest text-xs uppercase mb-6"
						style={{ color: darkMode ? colors.accent : colors.secondary }}
					>
						Connection History
					</Text>
				</View>
				{history.length === 0 ?
					<View
						className="rounded-xl p-6 items-center border-2 border-dashed"
						style={{ borderColor: darkMode ? "#334155" : colors.border }}
					>
						<Text
							className="font-plus text-sm"
							style={{ color: colors.mutedFg }}
						>
							No recent connections.
						</Text>
					</View>
				:	history.map((url, i) => (
						<View
							key={i}
							className="rounded-2xl p-4 mb-4 flex-row items-center border-2"
							style={{
								backgroundColor: darkMode ? "#1E293B" : colors.card,
								borderColor: darkMode ? "#334155" : colors.foreground,
								shadowColor: darkMode ? "#0F172A" : colors.foreground,
								shadowOffset: { width: 4, height: 4 },
								shadowOpacity: 1,
								shadowRadius: 0,
								elevation: 2,
							}}
						>
							<View
								className="p-2 mr-3 rounded-full"
								style={{ backgroundColor: darkMode ? "#0F172A" : colors.muted }}
							>
								<Ionicons name="time-outline" size={24} color={colors.accent} />
							</View>
							<Text
								className="font-plus-medium flex-1 text-[15px]"
								style={{ color: darkMode ? "white" : colors.foreground }}
							>
								{url}
							</Text>
						</View>
					))
				}
			</ScrollView>
		</SafeAreaView>
	);
}
