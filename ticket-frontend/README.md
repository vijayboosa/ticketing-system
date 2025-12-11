

````markdown
## 🚀 Getting Started

### 1. Installation
Navigate to the frontend directory and install dependencies:

```bash
cd frontend
npm install
````

### 2\. Configuration

Configure the Backend API URL in `src/config/api.ts`.

```typescript
// For iOS Simulator / Android Emulator (Standard)
export const API_BASE_URL = "http://localhost:4000";

// ⚠️ IMPORTANT: For Physical Devices
// Replace 'localhost' with your computer's local IP address
export const API_BASE_URL = "[http://192.168.1.10:4000](http://192.168.1.10:4000)"; 
```

### 3\. Running the App

Start the Expo development server:

```bash
npx expo start
```

  * **Android:** Press `a` (requires Android Studio/Emulator).
  * **iOS:** Press `i` (requires Xcode/Simulator - macOS only).
  * **Physical Device:** Install the **Expo Go** app and scan the QR code.

-----


## ⚠️ Assumptions & Limitations

### User Management

  * **No Registration UI:** New users cannot sign up via the app. They must be created directly in the backend/database.
  * **No Profile Editing:** Users cannot change passwords or update details within the app.

### Authentication

  * **Session Management:** The app uses simple JWT access tokens. There is no refresh token mechanism or auto-logout; if a token expires, the user must manually re-login.

### UI & UX features

  * **Calendar:** Users can view deadlines and drag cards to the "Completed" drop zone. Advanced features like dragging tasks between dates to reschedule are not implemented.
  * **Responsiveness:** The layout is optimized for mobile devices. Tablet and Desktop Web layouts are not specifically optimized.
  * **Offline Mode:** No offline support or caching. The device must be connected to the network/backend to function.
  * **Error Handling:** Basic alerts are used for errors. There are no global error boundaries or detailed retry flows.
  * **Pagination:** The ticket list renders all fetched tickets (suitable for the assignment scope).
