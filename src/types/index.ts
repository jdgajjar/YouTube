// User Types
export interface IUser {
  _id: string;
  email: string;
  username: string;
  password?: string;
  channelId?: string;
  watchHistory: string[];
  watchLater: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserCreate {
  email: string;
  username: string;
  password: string;
}

export interface IUserLogin {
  email: string;
  password: string;
}

// Channel Types
export interface IChannel {
  _id: string;
  name: string;
  description: string;
  avatar: string;
  banner: string;
  userId: string;
  subscribers: string[];
  videoCount: number;
  subscriberCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IChannelCreate {
  name: string;
  description?: string;
  avatar?: string;
  banner?: string;
}

// Video Types
export interface IVideo {
  _id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  channelId: string | IChannel;
  views: number;
  likes: string[];
  duration: number;
  uploadDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IVideoCreate {
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: number;
}

export interface IVideoUpdate {
  title?: string;
  description?: string;
  thumbnailUrl?: string;
}

// Comment Types
export interface IComment {
  _id: string;
  content: string;
  videoId: string;
  userId: string | IUser;
  likes: string[];
  parentCommentId?: string;
  replies?: IComment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ICommentCreate {
  content: string;
  videoId: string;
  parentCommentId?: string;
}

// Notification Types
export type NotificationType =
  | 'new_video'
  | 'video_like'
  | 'comment'
  | 'comment_like'
  | 'comment_reply'
  | 'subscription';

export interface INotification {
  _id: string;
  userId: string;
  type: NotificationType;
  message: string;
  videoId?: string;
  commentId?: string;
  actorId: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// Auth Types
export interface AuthState {
  user: IUser | null;
  channel: IChannel | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

// Video Player Types
export interface VideoPlayerProps {
  videoUrl: string;
  thumbnailUrl: string;
  title: string;
  autoPlay?: boolean;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}

export interface PlaylistItem {
  videoId: string;
  title: string;
  thumbnailUrl: string;
}

// Playlist Types
export interface IPlaylist {
  _id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelId: string | IChannel;
  videos: string[] | IVideo[];
  visibility: 'public' | 'private' | 'unlisted';
  videoCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPlaylistCreate {
  title: string;
  description?: string;
  visibility?: 'public' | 'private' | 'unlisted';
}

export interface IPlaylistUpdate {
  title?: string;
  description?: string;
  visibility?: 'public' | 'private' | 'unlisted';
}

// Search Types
export interface SearchFilters {
  query: string;
  sortBy?: 'relevance' | 'date' | 'views';
  dateFilter?: 'hour' | 'today' | 'week' | 'month' | 'year';
}

// Socket Events
export type SocketEvent =
  | 'notification'
  | 'new_video'
  | 'video_like'
  | 'comment'
  | 'comment_like'
  | 'comment_reply'
  | 'subscription';

export interface SocketMessage {
  event: SocketEvent;
  data: INotification;
}
