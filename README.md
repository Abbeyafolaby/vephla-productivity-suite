# Vephla Productivity Suite

## Project Overview

The Vephla Productivity Suite is a comprehensive full-stack application designed to enhance team collaboration and personal productivity. This backend system provides robust APIs for task management, note-taking, real-time chat communication, and file storage with authentication and role-based access control.


## Tech Stack

### Backend
- **Runtime:** Node.js (v18+)
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (JSON Web Tokens) with bcrypt
- **Real-time Communication:** Socket.io
- **API Paradigms:** RESTful & GraphQL (Apollo Server)
- **File Storage:** Multer with cloud storage integration
- **Validation:** Express-validator / Joi


## Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- MongoDB

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/vephla-productivity-suite.git
cd vephla-productivity-suite
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**

Create a `.env` file in the root directory:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=mongodb://localhost:27017/vephla-productivity
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/vephla-productivity

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your_refresh_token_secret_here
JWT_REFRESH_EXPIRE=30d

# CORS
CORS_ORIGIN=http://localhost:3000

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

4. **Start the development server**
```bash
npm run dev
```

5. **Run in production mode**
```bash
npm start
```

### Running Tests
```bash
npm test
```

### API Documentation
Once the server is running, access the API documentation at:
- Swagger UI: `http://localhost:5000/api-docs`
- GraphQL Playground: `http://localhost:5000/graphql`

## API Endpoints Summary

### Authentication Endpoints (REST)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/auth/register` | Register new user | Public |
| POST | `/api/auth/login` | Login user | Public |
| POST | `/api/auth/refresh` | Refresh access token | Public |
| POST | `/api/auth/logout` | Logout user | Private |
| GET | `/api/auth/me` | Get current user | Private |

### User Management Endpoints (REST)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/users` | Get all users | Admin |
| GET | `/api/users/:id` | Get user by ID | Admin/Manager |
| PUT | `/api/users/:id` | Update user | Admin |
| DELETE | `/api/users/:id` | Delete user | Admin |
| PUT | `/api/users/:id/role` | Update user role | Admin |

### Notes Endpoints (REST)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/notes` | Create note | Private |
| GET | `/api/notes` | Get all user notes | Private |
| GET | `/api/notes/:id` | Get note by ID | Private |
| PUT | `/api/notes/:id` | Update note | Private |
| DELETE | `/api/notes/:id` | Delete note | Private |
| GET | `/api/notes/shared` | Get shared notes | Private |

### Tasks Endpoints (REST)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/tasks` | Create task | Private |
| GET | `/api/tasks` | Get all user tasks | Private |
| GET | `/api/tasks/:id` | Get task by ID | Private |
| PUT | `/api/tasks/:id` | Update task | Private |
| DELETE | `/api/tasks/:id` | Delete task | Private |
| PUT | `/api/tasks/:id/status` | Update task status | Private |
| GET | `/api/tasks/team` | Get team tasks | Manager/Admin |

### File Upload Endpoints (REST)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/files/upload` | Upload file | Private |
| GET | `/api/files` | Get user files | Private |
| GET | `/api/files/:id` | Get file by ID | Private |
| DELETE | `/api/files/:id` | Delete file | Private |

### Chat Endpoints (REST)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/chats/rooms` | Create chat room | Private |
| GET | `/api/chats/rooms` | Get user chat rooms | Private |
| GET | `/api/chats/rooms/:id/messages` | Get room messages | Private |
| POST | `/api/chats/rooms/:id/messages` | Send message | Private |

### GraphQL Endpoints
**Endpoint:** `/graphql`

**Sample Queries:**
```graphql
# Get current user
query {
  me {
    id
    username
    email
    role
  }
}

# Get all tasks
query {
  tasks {
    id
    title
    description
    status
    priority
    dueDate
  }
}

# Get all notes
query {
  notes {
    id
    title
    content
    category
    tags
  }
}
```

**Sample Mutations:**
```graphql
# Create task
mutation {
  createTask(input: {
    title: "Complete project"
    description: "Finish the productivity suite"
    priority: HIGH
    dueDate: "2024-12-31"
  }) {
    id
    title
    status
  }
}

# Create note
mutation {
  createNote(input: {
    title: "Meeting Notes"
    content: "Discussion points..."
    category: "Work"
    tags: ["meeting", "important"]
  }) {
    id
    title
  }
}
```

### WebSocket Events (Socket.io)
| Event | Description | Payload |
|-------|-------------|---------|
| `connection` | User connects | - |
| `join_room` | Join chat room | `{ roomId }` |
| `leave_room` | Leave chat room | `{ roomId }` |
| `send_message` | Send chat message | `{ roomId, message }` |
| `receive_message` | Receive chat message | `{ roomId, message, sender }` |
| `typing` | User typing indicator | `{ roomId, username }` |
| `user_joined` | User joined room | `{ roomId, username }` |
| `user_left` | User left room | `{ roomId, username }` |

## Project Structure

```
vephla-productivity-suite/
├── src/
│   ├── config/
│   │   ├── database.js
│   │   ├── cloudinary.js
│   │   └── swagger.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Note.js
│   │   ├── Task.js
│   │   ├── ChatRoom.js
│   │   ├── Message.js
│   │   └── File.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── noteController.js
│   │   ├── taskController.js
│   │   ├── chatController.js
│   │   └── fileController.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── noteRoutes.js
│   │   ├── taskRoutes.js
│   │   ├── chatRoutes.js
│   │   └── fileRoutes.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── rbac.js
│   │   ├── errorHandler.js
│   │   ├── validator.js
│   │   └── upload.js
│   ├── graphql/
│   │   ├── schema.js
│   │   ├── resolvers/
│   │   │   ├── userResolvers.js
│   │   │   ├── noteResolvers.js
│   │   │   └── taskResolvers.js
│   │   └── typeDefs/
│   │       ├── user.js
│   │       ├── note.js
│   │       └── task.js
│   ├── services/
│   │   ├── authService.js
│   │   ├── emailService.js
│   │   └── fileService.js
│   ├── utils/
│   │   ├── logger.js
│   │   ├── errorResponse.js
│   │   └── helpers.js
│   ├── sockets/
│   │   └── chatSocket.js
│   ├── app.js
│   └── server.js
├── tests/
│   ├── unit/
│   └── integration/
├── uploads/
├── docs/
│   ├── architecture.md
│   ├── erd.png
│   └── api-examples.md
├── .env.example
├── .gitignore
├── package.json
├── jest.config.js
└── README.md
```

## Database Schema

See `docs/erd.png` for the complete Entity Relationship Diagram.

### Main Collections
- **Users:** Authentication and profile data
- **Notes:** User notes with categorization
- **Tasks:** Task management with status tracking
- **ChatRooms:** Real-time chat rooms
- **Messages:** Chat messages
- **Files:** Uploaded file metadata

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](/LICENSE.md) file for details.
