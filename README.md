# YouTube Clone

A full-featured YouTube clone built with Next.js 14, TypeScript, MongoDB, and Cloudinary. This application replicates core YouTube functionality including video upload, streaming, user authentication, comments, likes, subscriptions, and notifications.

![YouTube Clone](https://via.placeholder.com/800x400?text=YouTube+Clone)

## Features

### Authentication System
- User registration with email/password validation
- Secure login with JWT tokens
- Password hashing using bcrypt (12 rounds)
- Protected routes with middleware
- Session management with HTTP-only cookies

### User & Channel Management
- User profile creation and editing
- Channel creation (one per user)
- Channel customization (name, description, avatar, banner)
- Subscriber count tracking

### Video Management
- Full CRUD operations for videos
- Video upload to Cloudinary with progress tracking
- Thumbnail upload OR auto-generation from video
- Video metadata (title, description)
- Authorization: only video owner can edit/delete

### Custom Video Player
- Play/Pause controls
- Next/Previous video buttons
- Speed control: 0.5x to 2.0x in increments
- Progress bar with seek functionality
- Volume control with mute toggle
- Fullscreen mode
- Keyboard shortcuts (Space, K, F, M, Arrow keys)
- Auto-hide controls during playback

### Social Features
- **Likes:** Like/unlike videos and comments with real-time count updates
- **Comments:** Create, reply (nested), edit, and delete comments
- **Subscribe:** Subscribe/unsubscribe to channels with subscriber count display

### Notification System
- **In-App Notifications:**
  - New video from subscribed channels
  - Likes on your videos
  - Comments on your videos
  - Likes on your comments
  - Replies to your comments
  - Mark as read/unread functionality
  
- **Browser Push Notifications:**
  - Permission request on first visit
  - Real-time notifications for all events

### Content Discovery
- **Home Page:** Grid layout of all public videos
- **Subscriptions Page:** Videos from subscribed channels (chronological)
- **Search:** Full-text search by video title and description with debouncing
- **Channel Page:** Channel info with all uploaded videos

### User Collections
- **Watch History:** Automatic tracking, chronological order, clear functionality
- **Watch Later:** Manual add/remove, persistent storage

### Share Feature
- Copy video URL to clipboard
- Share to Twitter, Facebook, WhatsApp, Email
- Embed code generation

### Hover Preview
- Auto-play video preview on card hover

## Tech Stack

### Frontend
- **Next.js 14** (App Router)
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **React Context** for state management

### Backend
- **Next.js API Routes** for REST API
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **bcrypt** for password hashing

### Media Storage
- **Cloudinary** for video and image storage
- Automatic video optimization
- Auto-generated thumbnails

## Project Structure

```
youtube-clone/
├── src/
│   ├── app/
│   │   ├── (auth)/           # Auth pages (login, register)
│   │   ├── (main)/           # Main app pages
│   │   │   ├── channel/
│   │   │   ├── history/
│   │   │   ├── notifications/
│   │   │   ├── search/
│   │   │   ├── subscriptions/
│   │   │   ├── upload/
│   │   │   ├── watch/
│   │   │   └── watch-later/
│   │   ├── api/              # API routes
│   │   │   ├── auth/
│   │   │   ├── channels/
│   │   │   ├── comments/
│   │   │   ├── history/
│   │   │   ├── notifications/
│   │   │   ├── search/
│   │   │   ├── subscribe/
│   │   │   ├── subscriptions/
│   │   │   ├── users/
│   │   │   ├── videos/
│   │   │   └── watch-later/
│   │   ├── globals.css
│   │   └── layout.tsx
│   ├── components/
│   │   ├── comment/
│   │   ├── layout/
│   │   ├── ui/
│   │   └── video/
│   ├── contexts/
│   ├── hooks/
│   ├── lib/
│   ├── models/
│   ├── types/
│   └── utils/
├── public/
├── .env.example
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- MongoDB database (local or MongoDB Atlas)
- Cloudinary account

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/youtube-clone.git
   cd youtube-clone
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   ```

4. **Configure environment variables in `.env.local`:**
   ```env
   # MongoDB Connection
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/youtube-clone

   # JWT Secret (generate a secure random string)
   JWT_SECRET=your-super-secret-jwt-key-here

   # Cloudinary Configuration
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret

   # App Configuration
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

5. **Run the development server:**
   ```bash
   npm run dev
   ```

6. **Open [http://localhost:3000](http://localhost:3000) in your browser**

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | Secret key for JWT signing | Yes |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Yes |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Yes |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Yes |
| `NEXT_PUBLIC_APP_URL` | Application URL | Yes |

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/logout` | Logout user |
| GET | `/api/auth/me` | Get current user |

### Channels
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/channels` | List all channels |
| POST | `/api/channels` | Create channel |
| GET | `/api/channels/[id]` | Get channel details |
| PUT | `/api/channels/[id]` | Update channel |
| DELETE | `/api/channels/[id]` | Delete channel |

### Videos
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/videos` | List all videos |
| POST | `/api/videos` | Upload video |
| GET | `/api/videos/[id]` | Get video details |
| PUT | `/api/videos/[id]` | Update video |
| DELETE | `/api/videos/[id]` | Delete video |
| POST | `/api/videos/[id]/like` | Toggle like |
| GET | `/api/videos/[id]/comments` | Get comments |
| POST | `/api/videos/[id]/comments` | Add comment |

### Comments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/comments/[id]` | Get comment |
| PUT | `/api/comments/[id]` | Update comment |
| DELETE | `/api/comments/[id]` | Delete comment |
| POST | `/api/comments/[id]/like` | Toggle like |

### Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/subscribe/[channelId]` | Toggle subscription |
| GET | `/api/subscriptions` | Get subscription feed |
| GET | `/api/notifications` | Get notifications |
| GET | `/api/search` | Search videos/channels |
| GET/DELETE | `/api/history` | Watch history |
| GET/POST/DELETE | `/api/watch-later` | Watch later list |

## Deployment

### Vercel Deployment (Frontend)

1. **Connect your GitHub repository to Vercel**

2. **Configure environment variables in Vercel:**
   - Go to Project Settings → Environment Variables
   - Add all variables from `.env.example`

3. **Deploy:**
   - Vercel will automatically deploy on push to main branch
   - Or trigger manual deployment from dashboard

4. **Build Settings:**
   ```
   Framework: Next.js
   Build Command: npm run build
   Output Directory: .next
   Install Command: npm install
   ```

### Render Deployment (Alternative)

1. **Create a new Web Service on Render**

2. **Connect your GitHub repository**

3. **Configure:**
   ```
   Build Command: npm install && npm run build
   Start Command: npm start
   ```

4. **Add environment variables**

5. **Deploy**

### MongoDB Atlas Setup

1. Create a MongoDB Atlas account
2. Create a new cluster
3. Add database user with read/write access
4. Whitelist IP addresses (0.0.0.0/0 for all)
5. Get connection string and update `MONGODB_URI`

### Cloudinary Setup

1. Create a Cloudinary account
2. Go to Dashboard
3. Copy Cloud Name, API Key, and API Secret
4. Configure upload presets (optional)

## Database Schema

### User
```typescript
{
  email: string (unique)
  username: string (unique)
  password: string (hashed)
  channelId: ObjectId (ref: Channel)
  watchHistory: ObjectId[] (ref: Video)
  watchLater: ObjectId[] (ref: Video)
  timestamps: true
}
```

### Channel
```typescript
{
  name: string
  description: string
  avatar: string
  banner: string
  userId: ObjectId (ref: User)
  subscribers: ObjectId[] (ref: User)
  videoCount: number
  subscriberCount: number
  timestamps: true
}
```

### Video
```typescript
{
  title: string
  description: string
  videoUrl: string
  thumbnailUrl: string
  channelId: ObjectId (ref: Channel)
  views: number
  likes: ObjectId[] (ref: User)
  duration: number
  uploadDate: Date
  timestamps: true
}
```

### Comment
```typescript
{
  content: string
  videoId: ObjectId (ref: Video)
  userId: ObjectId (ref: User)
  likes: ObjectId[] (ref: User)
  parentCommentId: ObjectId (ref: Comment, nullable)
  timestamps: true
}
```

### Notification
```typescript
{
  userId: ObjectId (ref: User)
  type: enum
  message: string
  videoId: ObjectId (ref: Video, optional)
  commentId: ObjectId (ref: Comment, optional)
  actorId: ObjectId (ref: User)
  read: boolean
  timestamps: true
}
```

## Security Features

- **Password Hashing:** bcrypt with 12 salt rounds
- **JWT Authentication:** HTTP-only cookies, 7-day expiry
- **Input Validation:** Server-side validation on all endpoints
- **CORS:** Configured for specific origins
- **XSS Protection:** Content sanitization
- **MongoDB Injection Prevention:** Mongoose schema validation

## Performance Optimizations

- **Lazy Loading:** Videos and images load on demand
- **Infinite Scroll:** Pagination with infinite scroll
- **Debounced Search:** 300ms debounce on search queries
- **MongoDB Indexes:** Text indexes for search optimization
- **CDN Delivery:** Cloudinary for optimized media delivery
- **Next.js Image Optimization:** Automatic image optimization

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Next.js](https://nextjs.org/)
- [MongoDB](https://www.mongodb.com/)
- [Cloudinary](https://cloudinary.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [YouTube](https://youtube.com/) for design inspiration

---

Built with ❤️ using Next.js, TypeScript, MongoDB, and Cloudinary
