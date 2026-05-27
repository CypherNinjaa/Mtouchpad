import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface SettingsStore {
	sensitivity: number;
	scrollSpeed: number;
	leftHandMode: boolean;
	history: string[]; // Last 3 connected servers
	darkMode: boolean;
	reduceMotion: boolean;

	setSensitivity: (val: number) => void;
	setScrollSpeed: (val: number) => void;
	setLeftHandMode: (val: boolean) => void;
	addServerToHistory: (serverUrl: string) => void;
	setDarkMode: (val: boolean) => void;
	setReduceMotion: (val: boolean) => void;
}

export const useSettingsStore = create<SettingsStore>()(
	persist(
		(set) => ({
			sensitivity: 1.5,
			scrollSpeed: 1.0,
			leftHandMode: false,
			history: [],
			darkMode: true,
			reduceMotion: false,

			setSensitivity: (sensitivity) => set({ sensitivity }),
			setScrollSpeed: (scrollSpeed) => set({ scrollSpeed }),
			setLeftHandMode: (leftHandMode) => set({ leftHandMode }),
			addServerToHistory: (serverUrl) =>
				set((state) => {
					const newHistory = [
						serverUrl,
						...state.history.filter((s) => s !== serverUrl),
					].slice(0, 3);
					return { history: newHistory };
				}),
			setDarkMode: (darkMode) => set({ darkMode }),
			setReduceMotion: (reduceMotion) => set({ reduceMotion }),
		}),
		{
			name: "phonepad-settings",
			storage: createJSONStorage(() => AsyncStorage),
		},
	),
);
