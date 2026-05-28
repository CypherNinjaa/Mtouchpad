# MTouchpad

MTouchpad is an application that allows you to use your Android device as a wireless touchpad for your computer. It features smooth gesture support, dark mode, and easy WebSocket-based pairing.

## Downloads

Download the latest versions from our [GitHub Releases](https://github.com/CypherNinjaa/Mtouchpad/releases/latest) page:

- **Android Client**: `app-release.apk`
- **Windows Server**: `MTouchpad-Server.exe`

## Getting Started

### 1. Run the Desktop Server

1. Download `MTouchpad-Server.exe` and run it on your Windows computer.
2. The server will start and a status window will appear showing your computer's IP address and a QR code for pairing.

### 2. Install the Android App

1. Download `app-release.apk` and install it on your Android device.
2. Ensure your phone and your computer are connected to the **same Wi-Fi network**.
3. Open the app and use the pairing option (enter the IP address or scan the QR code).

## Features

- Simulated trackpad with mouse movement.
- Tap to click, two-finger tap to right-click.
- Two-finger scrolling.
- Settings menu with adjustable tracking speed.
- Dark mode compatibility.

## Tech Stack

- **Client**: React Native (Expo), NativeWind, Reanimated, React Native Gesture Handler.
- **Server**: Python, FastAPI, WebSockets, PyAutoGUI.
