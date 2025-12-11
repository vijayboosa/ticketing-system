## 📂 Folder Structure

```bash
/
├── backend/            # Node.js + TypeScript + PostgreSQL API
│   ├── src/
│   ├── db.sql          # Database schema
│   ├── package.json
│   └── .env.example
│
└── frontend/           # Expo React Native app
    ├── app/
    ├── src/
    ├── package.json
    └── expo-router config
```

-----

## 🛠 Backend Setup (Node.js + PostgreSQL)

### 1\. Install Dependencies

```bash
cd backend
npm install
```

### 2\. Database Configuration

Create a PostgreSQL database and apply the schema:

```bash
createdb ticket_system
psql -d ticket_system -f db.sql
```

### 3\. Environment Variables

Create a `.env` file in the `backend` folder:

```ini
PORT=4000
DATABASE_URL=postgres://postgres:password@localhost:5432/ticket_system
JWT_SECRET=super_secret_key_change_me
JWT_EXPIRES_IN=1h
```

### 4\. Start the Server

```bash
npm run dev
```

> The API will run at: `http://localhost:4000/api`

### 5\. Seed Initial Users

Since there is no registration UI, use these commands to create your test users:

**Create Admin:**

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123","role":"admin"}'
```

**Create User:**

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@example.com","password":"user123","role":"user"}'
```

-----

## 📱 Frontend Setup (Expo React Native)

### 1\. Install Dependencies

```bash
cd frontend
npm install
```

### 2\. Configure API Endpoint

Update `src/config/api.ts`.

  * **Simulator/Emulator:** Use `http://localhost:4000/api`
  * **Physical Device:** Use your machine's IP, e.g., `http://192.168.1.50:4000/api`

<!-- end list -->

```typescript
export const API_BASE_URL = "http://localhost:4000/api";
```

### 3\. Run the App

```bash
npx expo start
```

  * Press `a` for Android Emulator.
  * Press `i` for iOS Simulator.
  * Scan QR code for physical device.

-----

## 🔄 Ticket Lifecycle Flow

```mermaid
sequenceDiagram
    participant Admin
    participant Server
    participant DB
    participant User

    Note over Admin, User: Ticket Creation
    Admin->>Server: POST /tickets (Assign to User)
    Server->>DB: INSERT Ticket
    DB-->>Server: Success
    Server-->>Admin: Ticket Created

    Note over Admin, User: User Workflow
    User->>Server: GET /tickets/my
    Server->>DB: SELECT * WHERE assignedTo = User
    DB-->>Server: Return Tickets
    Server-->>User: JSON List
    
    User->>User: Drag card to "Completed"
    User->>Server: PATCH /tickets/:id/status (COMPLETED)
    Server->>DB: UPDATE status
    DB-->>Server: Success
    Server-->>User: Status Updated
```

-----

## ✅ Core Features

### 🛡 Admin

  * Create and Edit tickets.
  * Assign users to specific tasks.
  * View lists of all tickets and users.

### 👤 User

  * **My Tickets:** View only tickets assigned to them.
  * **Calendar View:** See deadlines visually on a calendar.
  * **Drag-to-Complete:** Interactive gesture to mark tasks as done.
  * **Status Updates:** Move tickets from *Pending* → *In Progress* → *Completed*.

-----

## ⚠️ Assumptions & Simplifications

  * **Auth:** No refresh tokens or password recovery.
  * **Validation:** Basic checks only (e.g., past deadlines are allowed).
  * **UI:** No profile management or user registration screens (users created via API).
  * **Platform:** Optimized for Mobile (iOS/Android); Tablet layout is default.
  * **Persistence:** No offline mode or caching.

-----

## 📺 Demo Video

[Click here to watch the demo video](./app_demo.mp4)

-----

## 🧪 Postman Collection

A Postman collection is included in the repo for easy API testing.

1.  Import `postman/ticket-backend.json`.
2.  Run the **Login** request first to auto-set your environment token.

<!-- end list -->

```
```