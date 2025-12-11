
````markdown

## 🚀 Getting Started

### 1. Installation
Navigate to the backend directory and install dependencies:

```bash
cd backend
npm install
````

### 2\. Database Setup

Ensure you have **PostgreSQL** installed and running. Create the database and apply the schema:

```bash
# Create database and run schema script
createdb ticket_system
psql -d ticket_system -f db.sql
```

### 3\. Environment Configuration

Create a `.env` file in the root of the `backend` folder with the following credentials:

```env
PORT=4000
DATABASE_URL=postgres://postgres:password@localhost:5432/ticket_system
JWT_SECRET=change_me_to_a_random_string
JWT_EXPIRES_IN=1h
```

### 4\. Running the Server

Start the development server:

```bash
npm run dev
```

The API will be available at `http://c:4000`.

-----

## 🧪 API Testing (Postman)

A Postman collection is included to help you quickly test all API endpoints.

1.  Locate the file **`ticket-backend.json`** in the `backend` folder.
2.  Open Postman and click **Import**.
3.  Drag and drop `ticket-backend.json` into Postman.
4.  The collection includes pre-configured requests for:
      * Auth (Register/Login)
      * Ticket Management (Create, List, Update Status)
      * User Listing

-----

## ⚡ Initial Data Seeding

Since there is no public registration UI, use the following `curl` commands to create your initial users for testing:

**Create Admin**

```bash
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123","role":"admin"}'
```

**Create User**

```bash
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@example.com","password":"user123","role":"user"}'
```

-----

## ⚠️ Assumptions & Limitations

### Authentication & Security

  * **Tokens:** Uses simple JWT access tokens with expiry. No refresh tokens, server-side logout, or token blacklisting.
  * **Security:** No rate limiting, IP throttling, or HTTPS termination (assumed to be behind a proxy in production). CORS is permissive for local dev.

### Data Management

  * **Transactions:** Multi-step operations (e.g., creating tickets + adding assignees) are not wrapped in SQL transactions for this demo.
  * **Deletion:** No "Soft Delete" or archival mechanism for tickets or users.
  * **History:** No audit logging or status history table; only the current status is stored.
  * **Pagination:** Endpoints return all data; no pagination or advanced filtering is implemented.

### Validation

  * **Business Logic:** Basic schema validation (Zod) is in place, but advanced rules (e.g., blocking past deadlines) are not enforced.
  * **Uploads:** No file attachment support.
