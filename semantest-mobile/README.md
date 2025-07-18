# Semantest Mobile

Cross-platform mobile application for Semantest built with React Native.

## Features

- **Cross-Platform**: Runs on both iOS and Android
- **Native Performance**: Optimized for mobile devices
- **Offline Support**: Work offline with automatic sync
- **Push Notifications**: Real-time test notifications
- **Biometric Authentication**: Secure access with Face ID/Touch ID
- **Background Sync**: Automatic data synchronization

## Architecture

### Core Technologies
- React Native 0.72.7
- TypeScript
- React Navigation 6
- Zustand (State Management)
- React Query (Data Fetching)
- MMKV (Secure Storage)

### Project Structure
```
semantest-mobile/
├── src/
│   ├── components/      # Reusable UI components
│   ├── screens/         # Screen components
│   ├── navigation/      # Navigation configuration
│   ├── services/        # API and native services
│   ├── stores/          # State management
│   ├── utils/           # Utility functions
│   ├── types/           # TypeScript definitions
│   └── contexts/        # React contexts
├── ios/                 # iOS-specific code
├── android/             # Android-specific code
└── __tests__/           # Test files
```

## Getting Started

### Prerequisites
- Node.js 18+
- React Native development environment
- Xcode (for iOS development)
- Android Studio (for Android development)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Install iOS dependencies:
```bash
cd ios && pod install
```

### Running the App

#### iOS
```bash
npm run ios
```

#### Android
```bash
npm run android
```

### Development Commands

- `npm start` - Start Metro bundler
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript checks
- `npm run clean` - Clean and reinstall dependencies

## Key Features Implementation

### Authentication
- Secure token storage using Keychain
- Biometric authentication support
- Automatic token refresh
- Session persistence

### Offline Capabilities
- Local data storage with MMKV
- Background sync with conflict resolution
- Queue-based sync mechanism
- Network state monitoring

### Push Notifications
- FCM (Android) and APNS (iOS) integration
- Local notifications support
- Notification channels and categories
- Background notification handling

### Native Integrations
- Camera access for visual testing
- File system access
- Share functionality
- Device information

## Build & Deployment

### Android
```bash
npm run build:android
```

### iOS
```bash
npm run build:ios
```

## Performance Targets

- App startup: <3 seconds
- UI responsiveness: 60fps
- Offline sync: <5 seconds
- Memory usage: <100MB (mobile)

## Security

- Biometric authentication
- Secure token storage
- Certificate pinning
- Data encryption at rest

## Contributing

See the main project README for contribution guidelines.

## License

Part of the Semantest project.