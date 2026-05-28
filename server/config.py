# server/config.py
import os

# Application Metadata
APP_NAME: str = "PhonePad"
APP_VERSION: str = "1.0.0"

# Network Configurations
HOST: str = "0.0.0.0"
PORT_WS: int = 8765
PORT_HTTP: int = 8766

# Security Configurations
ACCESS_CODE_LENGTH: int = 6
MAX_ATTEMPTS: int = 3

# Gesture & Mouse Configurations
SENSITIVITY: float = 1.5
