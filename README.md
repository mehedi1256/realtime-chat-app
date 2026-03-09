# ChatApp - Real-Time Messaging Application

A production-ready, full-stack real-time messaging web application inspired by WhatsApp and Messenger. Built with a Node.js backend and a Next.js frontend, it supports encrypted 1-to-1 chat, file sharing, emoji reactions, and peer-to-peer video/audio calling via WebRTC.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Features](#features)
- [How It Works](#how-it-works)
  - [Authentication Flow](#authentication-flow)
  - [Real-Time Messaging Flow](#real-time-messaging-flow)
  - [End-to-End Encryption](#end-to-end-encryption)
  - [File Upload Flow](#file-upload-flow)
  - [Video and Audio Calling](#video-and-audio-calling)
- [Project Structure](#project-structure)
- [Database Schemas](#database-schemas)
- [API Reference](#api-reference)
- [Socket Events Reference](#socket-events-reference)
- [Environment Variables](#environment-variables)
- [Setup and Installation](#setup-and-installation)
- [Running the Application](#running-the-application)
- [Security](#security)
- [UI and Design](#ui-and-design)
- [License](#license)

---

## Tech Stack

### Backend

| Technology | Purpose |
|---|---|
| **Node.js** | JavaScript runtime for the server |
| **Express.js v4** | HTTP REST API framework |
| **Socket.IO v4** | Real-time bidirectional WebSocket communication |
| **MongoDB** | NoSQL document database for users and messages |
| **Mongoose v8** | MongoDB ODM with schemas, validation, and hooks |
| **JSON Web Token (jsonwebtoken)** | Stateless authentication tokens |
| **bcryptjs** | Password hashing with salted rounds |
| **multer** | Multipart form-data handling for file uploads |
| **crypto-js** | AES encryption library (used on client, available on server) |
| **cors** | Cross-Origin Resource Sharing middleware |
| **cookie-parser** | Cookie parsing middleware |
| **express-rate-limit** | API rate limiting for abuse prevention |
| **dotenv** | Environment variable management |

### Frontend

| Technology | Purpose |
|---|---|
| **Next.js 14 (App Router)** | React framework with server-side rendering and file-based routing |
| **React 18** | Component-based UI library |
| **TailwindCSS v3** | Utility-first CSS framework |
| **Zustand v5** | Lightweight state management with persistence |
| **Socket.IO Client v4** | WebSocket client for real-time events |
| **Axios** | HTTP client with interceptors for API calls |
| **React Hook Form** | Performant form handling and validation |
| **Framer Motion v11** | Declarative animations and transitions |
| **crypto-js** | Client-side AES encryption/decryption |
| **emoji-picker-react** | Full emoji picker component |
| **react-dropzone** | Drag-and-drop file upload zone |
| **react-hot-toast** | Toast notification system |
| **react-icons** | Icon library (Heroicons set) |
| **WebRTC (browser native)** | Peer-to-peer video and audio calling |

### Infrastructure

| Component | Technology |
|---|---|
| Database | MongoDB (local or MongoDB Atlas) |
| File Storage | Local disk (`server/uploads/`) |
| WebSocket Transport | Socket.IO over WebSocket with polling fallback |
| STUN Servers | Google public STUN (`stun.l.google.com:19302`) |

---

## Architecture Overview

```
                    ┌─────────────────────────────────────────────────┐
                    │              Next.js Frontend (Port 3000)       │
                    │                                                 │
                    │  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
                    │  │ Zustand  │  │ Socket.IO│  │  CryptoJS    │  │
                    │  │  Store   │  │  Client  │  │  Encryption  │  │
                    │  └────┬─────┘  └────┬─────┘  └──────┬───────┘  │
                    │       │             │               │          │
                    │  ┌────┴─────────────┴───────────────┴───────┐  │
                    │  │         React Components (UI)            │  │
                    │  │  Pages: Login | Register | Chat          │  │
                    │  │  Components: Sidebar | ChatWindow |      │  │
                    │  │  MessageBubble | CallScreen | ...        │  │
                    │  └──────────────┬──────────────┬────────────┘  │
                    │                 │              │               │
                    │            HTTP/Axios     WebSocket            │
                    └─────────────────┼──────────────┼───────────────┘
                                      │              │
                    ┌─────────────────┼──────────────┼───────────────┐
                    │              Express Backend (Port 5000)       │
                    │                 │              │               │
                    │  ┌──────────────┴──┐  ┌───────┴────────────┐  │
                    │  │  REST API       │  │  Socket.IO Server  │  │
                    │  │  /api/auth      │  │  Messaging events  │  │
                    │  │  /api/users     │  │  Typing events     │  │
                    │  │  /api/messages  │  │  Presence events   │  │
                    │  │  /uploads       │  │  Call signaling    │  │
                    │  └───────┬────────┘  └────────┬───────────┘  │
                    │          │                     │              │
                    │  ┌───────┴─────────────────────┴───────────┐  │
                    │  │  Middleware: JWT Auth | Multer | CORS    │  │
                    │  │  Rate Limiting                          │  │
                    │  └───────────────────┬─────────────────────┘  │
                    └──────────────────────┼─────────────────────────┘
                                           │
                    ┌──────────────────────┼─────────────────────────┐
                    │                 MongoDB                        │
                    │  Collections: users | messages                 │
                    └───────────────────────────────────────────────┘
```

For video/audio calls, media streams flow directly between browsers via WebRTC (peer-to-peer). The backend only relays signaling messages (offer, answer, ICE candidates) -- it never touches the media data.

---

## Features

### Authentication
- User registration with name, email, password, and optional profile picture
- Login with email and password
- JWT-based stateless authentication (7-day token expiry)
- Passwords hashed with bcrypt (12 salt rounds)
- Password excluded from all API responses
- Automatic redirect based on auth state

### Real-Time Messaging
- Private 1-to-1 chat between any two users
- Instant message delivery via WebSocket
- Online/offline presence with green dot indicators
- Real-time typing indicators ("typing..." shown to the other user)
- Read receipts with double-check marks (gray = sent, blue = seen)
- Message timestamps with smart formatting (now, 5m, 2:30 PM, Yesterday, Mon, Mar 9)
- Unread message count badges per conversation
- Conversation list sorted by most recent message

### End-to-End Encryption
- All messages encrypted with AES-256 before leaving the sender's browser
- Server stores only ciphertext -- it cannot read message content
- Conversation-specific keys derived from both user IDs + a shared secret
- Decryption happens on the receiver's browser
- Uses the crypto-js library

### File Sharing
- Upload and share any file type (images, PDFs, DOCX, XLSX, MP4, ZIP, etc.)
- Maximum file size: 50MB
- Drag-and-drop upload interface
- Upload progress bar
- Image previews displayed inline in chat
- Video files play directly in the chat
- Other file types show a download card with file name, type, and download button
- Files stored on disk at `server/uploads/`

### Emoji and Reactions
- Full emoji picker integrated into the message input
- React to any message with 6 quick reactions (heart, laugh, thumbs up, wow, sad, pray)
- Toggle reactions on/off; see aggregated reaction counts

### Message Management
- Edit sent messages (shows "edited" label)
- Delete sent messages (soft delete, shows "This message was deleted")
- Context menu on hover for edit, delete, and react actions

### Video and Audio Calling
- 1-to-1 audio calls
- 1-to-1 video calls
- WebRTC peer-to-peer media streaming (no server relay for audio/video)
- Call signaling via Socket.IO
- Incoming call notification with accept/reject
- In-call controls: mute microphone, toggle camera, end call
- Call duration timer
- Full-screen call interface with picture-in-picture local video
- Automatic call rejection if user is already in a call
- Notification when called user is offline

### UI/UX
- Dark mode with toggle (persisted in localStorage)
- Fully responsive layout (desktop, tablet, mobile)
- WhatsApp-style chat pattern background
- Smooth Framer Motion animations throughout
- Toast notifications for success/error states
- Browser notification API for new messages when tab is not focused
- Scrollbar styling for chat areas

---

## How It Works

### Authentication Flow

```
1. User fills out the registration form (name, email, password, optional profile picture)
2. Frontend sends POST /api/auth/register with multipart form data
3. Backend validates input, checks for duplicate email
4. Password is hashed with bcrypt (12 rounds) via a Mongoose pre-save hook
5. User document is saved to MongoDB
6. Backend generates a JWT token (signed with JWT_SECRET, expires in 7 days)
7. Token + user data returned to the frontend
8. Frontend stores token and user in Zustand (persisted to localStorage)
9. User is redirected to /chat

For login, the same flow applies except step 3-5 are replaced with
credential verification (find user by email, compare password hash).
```

### Real-Time Messaging Flow

```
1. User opens /chat -> frontend connects to Socket.IO with JWT in handshake
2. Backend authenticates the socket, marks user as online, broadcasts user_online
3. User selects a contact -> frontend fetches message history via GET /api/messages/:userId
4. Messages are decrypted client-side using the conversation key
5. User types a message -> text is AES-encrypted on the client
6. Client emits send_message with { receiverId, encryptedMessage }
7. Backend saves the encrypted message to MongoDB
8. Backend emits receive_message to both sender and receiver rooms
9. Receiver's client decrypts and displays the message in real-time
10. When the receiver views the conversation, client emits message_seen
11. Backend marks messages as seen in DB and notifies the sender
12. Sender sees blue double-check marks appear
```

### End-to-End Encryption

The encryption uses AES from the crypto-js library.

**Key derivation:** For each conversation between User A and User B, a unique key is generated by sorting both user IDs alphabetically, concatenating them with a shared secret, and hashing with SHA-256.

```
conversationKey = SHA256(sort([userA._id, userB._id]).join('-') + ENCRYPTION_KEY)
```

**Encryption:** Before sending, the plaintext message is encrypted:
```
ciphertext = AES.encrypt(plaintext, conversationKey).toString()
```

**Decryption:** On receipt, the ciphertext is decrypted:
```
plaintext = AES.decrypt(ciphertext, conversationKey).toString(Utf8)
```

The server only ever sees the ciphertext. Message content cannot be read by the server or any party without the encryption key.

### File Upload Flow

```
1. User clicks the paperclip icon or drags a file onto the upload zone
2. File is validated (max 50MB)
3. Frontend shows a preview (image) or file card with file name and size
4. User clicks Send -> file is uploaded via POST /api/messages/upload/file (multipart)
5. Multer saves the file to server/uploads/ with a random hex filename
6. Backend returns { fileUrl, fileName, fileType }
7. Client emits send_message with file metadata (no encrypted text)
8. Receiver sees the file inline: images render as previews, videos play inline,
   other files show a download card
```

### Video and Audio Calling

The calling feature uses WebRTC for peer-to-peer media streaming with Socket.IO for signaling.

```
Outgoing call flow:
1. User A clicks the phone/video button in the chat header
2. Browser requests microphone (+ camera for video) permissions
3. A RTCPeerConnection is created with Google STUN servers
4. Local media tracks are added to the peer connection
5. An SDP offer is created and set as local description
6. The offer is sent to User B via socket event call_user

7. User B receives incoming_call with the offer and caller info
8. User B sees the IncomingCall notification (accept/reject buttons)

If User B accepts:
9. User B's browser requests media permissions
10. A RTCPeerConnection is created, remote description set to the offer
11. An SDP answer is created and sent back via call_accepted
12. User A receives the answer, sets it as remote description
13. ICE candidates are exchanged via ice_candidate events
14. WebRTC connection establishes -> media streams directly peer-to-peer
15. Both users see the full-screen CallScreen with controls

If User B rejects:
9. call_rejected is sent to User A
10. Both sides return to the chat view

Ending a call:
- Either user clicks the red end button
- call_ended is sent to the other party
- Both sides stop media tracks, close the peer connection, and return to chat
```

**STUN servers** are used so peers can discover their public IP addresses for NAT traversal. No TURN server is included, which means calls may not connect if both users are behind strict symmetric NATs. For production, add a TURN server.

---

## Project Structure

```
node-project/
│
├── server/                          # Express.js Backend
│   ├── config/
│   │   └── db.js                    # MongoDB connection via Mongoose
│   ├── controllers/
│   │   ├── authController.js        # Register, login, get current user
│   │   ├── messageController.js     # Get messages, mark seen, edit, delete, react, upload
│   │   └── userController.js        # List users, search users
│   ├── middleware/
│   │   ├── auth.js                  # JWT verification middleware (Bearer token or cookie)
│   │   └── upload.js                # Multer disk storage config (50MB limit)
│   ├── models/
│   │   ├── Message.js               # Message schema with compound indexes
│   │   └── User.js                  # User schema with bcrypt pre-save hook
│   ├── routes/
│   │   ├── authRoutes.js            # POST /register, POST /login, GET /me
│   │   ├── messageRoutes.js         # GET /:userId, PUT /:userId/seen, etc.
│   │   └── userRoutes.js            # GET /, GET /search
│   ├── sockets/
│   │   └── socketHandler.js         # All Socket.IO events (messaging + call signaling)
│   ├── uploads/                     # Uploaded files stored here
│   ├── utils/
│   │   └── generateToken.js         # JWT token generator (7-day expiry)
│   ├── .env                         # Environment variables (not committed)
│   ├── .env.example                 # Template for environment variables
│   ├── package.json                 # Backend dependencies and scripts
│   └── server.js                    # Entry point: HTTP server, Express, Socket.IO
│
├── client/                          # Next.js 14 Frontend (App Router)
│   ├── app/
│   │   ├── chat/
│   │   │   └── page.jsx             # Main chat page (protected, two-panel layout)
│   │   ├── login/
│   │   │   └── page.jsx             # Login page with React Hook Form
│   │   ├── register/
│   │   │   └── page.jsx             # Registration page with avatar upload
│   │   ├── globals.css              # Tailwind imports, scrollbar styles, chat pattern
│   │   ├── layout.js                # Root layout with dark mode and toast provider
│   │   └── page.js                  # Root redirect (to /chat or /login)
│   ├── components/
│   │   ├── Avatar.jsx               # User avatar with initials fallback and online dot
│   │   ├── CallScreen.jsx           # Full-screen video/audio call UI with controls
│   │   ├── ChatWindow.jsx           # Chat header, message list, input bar, call buttons
│   │   ├── DarkModeToggle.jsx       # Sun/moon toggle button
│   │   ├── EmojiPicker.jsx          # Emoji picker popover (emoji-picker-react wrapper)
│   │   ├── FilePreview.jsx          # Inline image/video preview or file download card
│   │   ├── FileUpload.jsx           # Drag-and-drop upload modal with progress bar
│   │   ├── IncomingCall.jsx         # Incoming call notification banner (accept/reject)
│   │   ├── MessageBubble.jsx        # Individual message: bubble, timestamp, seen, reactions
│   │   ├── Sidebar.jsx              # User list, search, last message preview, unread badge
│   │   └── TypingIndicator.jsx      # Animated bouncing dots
│   ├── services/
│   │   ├── api.js                   # Axios instance with auth interceptor, all API methods
│   │   └── socket.js                # Socket.IO client singleton (connect/disconnect/get)
│   ├── store/
│   │   └── useStore.js              # Zustand store: auth, users, messages, calls, theme
│   ├── utils/
│   │   ├── encryption.js            # AES encrypt/decrypt + conversation key derivation
│   │   ├── formatTime.js            # Smart timestamp and "last seen" formatting
│   │   └── useWebRTC.js             # Custom React hook for WebRTC peer connection lifecycle
│   ├── .env.example                 # Template for frontend environment variables
│   ├── .env.local                   # Frontend environment variables
│   ├── jsconfig.json                # Path alias (@/ -> ./)
│   ├── next.config.js               # Next.js config (remote image domains)
│   ├── package.json                 # Frontend dependencies and scripts
│   ├── postcss.config.js            # PostCSS config for Tailwind
│   └── tailwind.config.js           # Tailwind config with custom chat colors, dark mode
│
└── README.md                        # This file
```

---

## Database Schemas

### User Model

| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Auto-generated unique identifier |
| `name` | String | Required, 2-50 characters, trimmed |
| `email` | String | Required, unique, lowercase, validated format |
| `password` | String | Required, min 6 chars, hashed with bcrypt, excluded from queries by default |
| `profilePicture` | String | Path to uploaded avatar image (e.g., `/uploads/abc123.jpg`) |
| `isOnline` | Boolean | Whether the user currently has an active socket connection |
| `lastSeen` | Date | Timestamp of when the user last disconnected |
| `createdAt` | Date | Auto-generated by Mongoose timestamps |
| `updatedAt` | Date | Auto-generated by Mongoose timestamps |

**Indexes:** `{ email: 1 }` (unique), `{ name: 'text' }` (full-text search)

### Message Model

| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Auto-generated unique identifier |
| `sender` | ObjectId (ref: User) | The user who sent the message |
| `receiver` | ObjectId (ref: User) | The user who receives the message |
| `encryptedMessage` | String | AES-encrypted message content (ciphertext) |
| `fileUrl` | String | Path to an uploaded file attachment |
| `fileName` | String | Original filename of the attachment |
| `fileType` | String | MIME type of the attachment |
| `isSeen` | Boolean | Whether the receiver has viewed this message |
| `isDeleted` | Boolean | Soft-delete flag (message content is cleared) |
| `isEdited` | Boolean | Whether the message has been edited |
| `reactions` | Array of `{ userId: ObjectId, emoji: String }` | Emoji reactions from users |
| `createdAt` | Date | Auto-generated by Mongoose timestamps |
| `updatedAt` | Date | Auto-generated by Mongoose timestamps |

**Indexes:** `{ sender: 1, receiver: 1, createdAt: -1 }` (conversation queries), `{ receiver: 1, isSeen: 1 }` (unread count)

---

## API Reference

All endpoints are prefixed with `/api`. Protected routes require an `Authorization: Bearer <token>` header.

### Authentication

| Method | Endpoint | Auth | Body / Params | Description |
|---|---|---|---|---|
| POST | `/api/auth/register` | No | `name`, `email`, `password`, `profilePicture` (file) | Create a new account. Returns JWT + user object. |
| POST | `/api/auth/login` | No | `email`, `password` | Authenticate. Returns JWT + user object. |
| GET | `/api/auth/me` | Yes | -- | Get the currently authenticated user's profile. |

### Users

| Method | Endpoint | Auth | Params | Description |
|---|---|---|---|---|
| GET | `/api/users` | Yes | -- | List all users except the current user. Includes last message, unread count, and online status. Sorted by most recent conversation. |
| GET | `/api/users/search` | Yes | `?q=<name>` | Search users by name (case-insensitive regex match). |

### Messages

| Method | Endpoint | Auth | Params / Body | Description |
|---|---|---|---|---|
| GET | `/api/messages/:userId` | Yes | `?page=1&limit=50` | Get paginated conversation messages with a specific user. |
| PUT | `/api/messages/:userId/seen` | Yes | -- | Mark all unread messages from `:userId` as seen. |
| PUT | `/api/messages/:id/edit` | Yes | `{ encryptedMessage }` | Edit a message you sent. Sets `isEdited: true`. |
| DELETE | `/api/messages/:id` | Yes | -- | Soft-delete a message you sent. Clears content and file. |
| POST | `/api/messages/:id/react` | Yes | `{ emoji }` | Toggle an emoji reaction. Same emoji removes it; different emoji updates it. |
| POST | `/api/messages/upload/file` | Yes | `file` (multipart) | Upload a file attachment. Returns `{ fileUrl, fileName, fileType }`. |

### Health Check

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Returns `{ status: 'ok', timestamp }`. |

### Static Files

| Path | Description |
|---|---|
| `/uploads/*` | Serves uploaded files (profile pictures, attachments). |

---

## Socket Events Reference

All socket connections require a JWT token in the handshake: `{ auth: { token } }`.

### Messaging Events

| Event | Emitted By | Received By | Payload | Description |
|---|---|---|---|---|
| `send_message` | Client | Server | `{ receiverId, encryptedMessage, fileUrl?, fileName?, fileType? }` | Send a new message. Server saves to DB and emits `receive_message` to both parties. |
| `receive_message` | Server | Client | Full populated message object | A new message has arrived. |
| `typing` | Client | Server -> Receiver | `{ receiverId }` | Notify that you are typing. Server relays to receiver. |
| `stop_typing` | Client | Server -> Receiver | `{ receiverId }` | Notify that you stopped typing. |
| `message_seen` | Client | Server -> Sender | `{ senderId, receiverId }` | Mark all messages from sender as seen. Server updates DB and notifies sender. |
| `message_deleted` | Client | Server -> Receiver | `{ messageId, receiverId }` | Soft-delete a message. Server clears content and notifies receiver. |
| `message_edited` | Client | Server -> Receiver | `{ messageId, encryptedMessage, receiverId }` | Edit a message. Server updates DB and sends populated message to both. |
| `message_reaction` | Client | Server -> Receiver | `{ messageId, emoji, receiverId }` | Toggle a reaction. Server updates and sends populated message to both. |

### Presence Events

| Event | Emitted By | Received By | Payload | Description |
|---|---|---|---|---|
| `user_online` | Server | All clients | `{ userId }` | A user connected. Broadcast on socket connection. |
| `user_offline` | Server | All clients | `{ userId, lastSeen }` | A user disconnected. Broadcast on socket disconnect. |

### Call Signaling Events (WebRTC)

| Event | Emitted By | Received By | Payload | Description |
|---|---|---|---|---|
| `call_user` | Caller | Server -> Receiver | `{ to, offer, type }` | Initiate a call. `type` is `'audio'` or `'video'`. `offer` is the SDP offer. |
| `incoming_call` | Server | Receiver | `{ from: { id, name, profilePicture }, offer, type }` | Incoming call notification with caller info and SDP offer. |
| `call_accepted` | Receiver | Server -> Caller | `{ to, answer }` | Accept a call. `answer` is the SDP answer. |
| `call_rejected` | Receiver | Server -> Caller | `{ to }` | Reject a call. |
| `call_unavailable` | Server | Caller | `{ userId }` | The called user is not online. |
| `ice_candidate` | Either peer | Server -> Other peer | `{ to, candidate }` | Exchange ICE candidates for NAT traversal. |
| `call_ended` | Either peer | Server -> Other peer | `{ to }` | End an active call. |

---

## Environment Variables

### Backend (`server/.env`)

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/chatapp
JWT_SECRET=your_jwt_secret_here_change_in_production
CLIENT_URL=http://localhost:3000
```

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port. Defaults to `5000`. |
| `MONGODB_URI` | Yes | MongoDB connection string. Use `mongodb://localhost:27017/chatapp` for local or a MongoDB Atlas URI for cloud. |
| `JWT_SECRET` | Yes | Secret key for signing JWT tokens. Use a long random string in production. |
| `CLIENT_URL` | No | Frontend origin for CORS. Defaults to `http://localhost:3000`. |

### Frontend (`client/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_ENCRYPTION_KEY=your_encryption_key_here
```

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | No | Backend server URL. Defaults to `http://localhost:5000`. |
| `NEXT_PUBLIC_ENCRYPTION_KEY` | No | Shared secret used for deriving AES conversation keys. Both users must use the same value. |

---

## Setup and Installation

### Prerequisites

- **Node.js** v18 or higher (tested on v24)
- **npm** v8 or higher
- **MongoDB** running locally or a MongoDB Atlas cloud instance

### 1. Navigate to the project

```bash
cd /var/www/html/node-project
```

### 2. Install backend dependencies

```bash
cd server
npm install
```

### 3. Configure backend environment

```bash
cp .env.example .env
```

Edit `server/.env` and set:
- `MONGODB_URI` to your MongoDB connection string
- `JWT_SECRET` to a secure random string (e.g., `openssl rand -hex 32`)

### 4. Install frontend dependencies

```bash
cd ../client
npm install
```

### 5. Configure frontend environment

```bash
cp .env.example .env.local
```

Edit `client/.env.local` if your backend runs on a different host or port.

### 6. Start MongoDB

If running locally:

```bash
mongod
```

Or use MongoDB Atlas -- just update the `MONGODB_URI` in `server/.env` with your cluster connection string.

---

## Running the Application

Open two terminal windows:

**Terminal 1 -- Backend:**

```bash
cd server
npm run dev
```

The server starts on `http://localhost:5000`. You should see:
```
Server running on port 5000
MongoDB connected: localhost
```

**Terminal 2 -- Frontend:**

```bash
cd client
npm run dev
```

The client starts on `http://localhost:3000`.

Open `http://localhost:3000` in your browser. Register two accounts in two different browser windows or tabs to test real-time messaging and calling.

### Production Build

```bash
# Backend (use pm2 or similar process manager)
cd server
npm start

# Frontend
cd client
npm run build
npm start
```

---

## Security

| Measure | Implementation |
|---|---|
| **Password Hashing** | bcrypt with 12 salt rounds. Passwords are never stored or returned in plaintext. |
| **Authentication** | JWT tokens in Authorization header. Verified on every API request and socket connection. |
| **Token Expiry** | Tokens expire after 7 days. Expired tokens are rejected. |
| **End-to-End Encryption** | Messages are AES-encrypted on the client before transmission. The server stores only ciphertext. |
| **File Upload Validation** | Multer enforces a 50MB size limit. Profile pictures are restricted to image MIME types (5MB). |
| **Rate Limiting** | express-rate-limit allows 200 requests per 15-minute window per IP. |
| **CORS** | Restricted to the configured `CLIENT_URL` origin only. Credentials are allowed. |
| **Password Field Exclusion** | The User schema uses `select: false` on the password field and a custom `toJSON` method to strip it from all responses. |
| **Input Validation** | Mongoose schema validators enforce required fields, email format, and string lengths. |
| **Soft Delete** | Deleted messages are flagged, not removed from the database. Content is cleared so it cannot be recovered. |
| **Socket Authentication** | Socket.IO middleware verifies the JWT before allowing any connection. |

---

## UI and Design

The interface follows a WhatsApp/Messenger-inspired design built entirely with TailwindCSS:

- **Two-panel layout:** Left sidebar with contact list + right chat window
- **Mobile responsive:** Sidebar and chat swap on screens below `md` breakpoint
- **Dark mode:** Class-based toggle (`darkMode: 'class'`) stored in Zustand and localStorage
- **Chat bubbles:** Sender messages are green (right-aligned), receiver messages are white/dark (left-aligned)
- **Chat background:** Subtle cross-pattern SVG background matching WhatsApp's style
- **Animations:** Framer Motion for page transitions, message entrances, button feedback, typing dots, and call ring pulses
- **Avatars:** Profile picture or colored initials (deterministic color from name hash)
- **Scrollbar:** Custom thin scrollbar styling for chat and sidebar
- **Call UI:** Full-screen overlay with gradient backgrounds, picture-in-picture local video, and frosted glass control bar

### Color Palette (Custom Tailwind Colors)

| Token | Light | Dark | Usage |
|---|---|---|---|
| `chat-bg` | `#e5ddd5` | `#0b141a` | Chat background |
| `chat-sender` | `#dcf8c6` | `#005c4b` | Sent message bubble |
| `chat-receiver` | `#ffffff` | `#202c33` | Received message bubble |
| `chat-sidebar` | `#f0f2f5` | `#111b21` | Sidebar background |
| `chat-header` | `#008069` | `#202c33` | Chat header |
| `chat-input` | `#f0f2f5` | `#2a3942` | Input field background |
| `primary-500` | `#3b82f6` | `#3b82f6` | Buttons, links, accents |

---

## License

MIT
