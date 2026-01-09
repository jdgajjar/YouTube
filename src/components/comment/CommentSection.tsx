'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import { CommentSkeleton } from '@/components/ui/Skeleton';

interface Comment {
  _id: string;
  content: string;
  userId: {
    _id: string;
    username: string;
  };
  likes: string[];
  likeCount: number;
  replies: Comment[];
  createdAt: string;
  updatedAt: string;
}

interface CommentSectionProps {
  videoId: string;
  videoOwnerId?: string;
}

export default function CommentSection({ videoId, videoOwnerId }: CommentSectionProps) {
  const { user, isAuthenticated } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [likedCommentIds, setLikedCommentIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // Fetch comments
  const fetchComments = useCallback(async () => {
    try {
      const response = await fetch(`/api/videos/${videoId}/comments`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setComments(data.data.comments);
        setLikedCommentIds(data.data.likedCommentIds || []);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setIsLoading(false);
    }
  }, [videoId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Add comment
  const handleSubmitComment = async (parentCommentId?: string) => {
    const content = parentCommentId ? replyContent : newComment;
    if (!content.trim()) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/videos/${videoId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content.trim(),
          parentCommentId,
        }),
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        
        if (parentCommentId) {
          // Add reply to parent comment
          setComments((prev) =>
            prev.map((comment) =>
              comment._id === parentCommentId
                ? { ...comment, replies: [...comment.replies, data.data] }
                : comment
            )
          );
          setReplyContent('');
          setReplyingTo(null);
        } else {
          // Add new top-level comment
          setComments((prev) => [data.data, ...prev]);
          setNewComment('');
          setShowCommentInput(false);
        }
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit comment
  const handleEditComment = async (commentId: string, isReply: boolean = false) => {
    if (!editContent.trim()) return;

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: editContent.trim() }),
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();

        if (isReply) {
          setComments((prev) =>
            prev.map((comment) => ({
              ...comment,
              replies: comment.replies.map((reply) =>
                reply._id === commentId ? { ...reply, content: data.data.content } : reply
              ),
            }))
          );
        } else {
          setComments((prev) =>
            prev.map((comment) =>
              comment._id === commentId ? { ...comment, content: data.data.content } : comment
            )
          );
        }

        setEditingComment(null);
        setEditContent('');
      }
    } catch (error) {
      console.error('Failed to edit comment:', error);
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId: string, isReply: boolean = false) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        if (isReply) {
          setComments((prev) =>
            prev.map((comment) => ({
              ...comment,
              replies: comment.replies.filter((reply) => reply._id !== commentId),
            }))
          );
        } else {
          setComments((prev) => prev.filter((comment) => comment._id !== commentId));
        }
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  // Like comment
  const handleLikeComment = async (commentId: string) => {
    if (!isAuthenticated) return;

    try {
      const response = await fetch(`/api/comments/${commentId}/like`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();

        // Update like status in state
        if (data.data.liked) {
          setLikedCommentIds((prev) => [...prev, commentId]);
        } else {
          setLikedCommentIds((prev) => prev.filter((id) => id !== commentId));
        }

        // Update like count
        setComments((prev) =>
          prev.map((comment) => {
            if (comment._id === commentId) {
              return { ...comment, likeCount: data.data.likeCount };
            }
            return {
              ...comment,
              replies: comment.replies.map((reply) =>
                reply._id === commentId ? { ...reply, likeCount: data.data.likeCount } : reply
              ),
            };
          })
        );
      }
    } catch (error) {
      console.error('Failed to like comment:', error);
    }
  };

  // Format time ago
  const formatTimeAgo = (date: string): string => {
    const now = new Date();
    const commentDate = new Date(date);
    const diffMs = now.getTime() - commentDate.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffMinutes > 0) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  // Render single comment
  const renderComment = (comment: Comment, isReply: boolean = false) => {
    const isLiked = likedCommentIds.includes(comment._id);
    const canEdit = user?._id === comment.userId._id;
    const canDelete = canEdit || user?._id === videoOwnerId;
    const isEditing = editingComment === comment._id;

    return (
      <div key={comment._id} className={`flex gap-3 ${isReply ? 'ml-12 mt-3' : 'py-4'}`}>
        <Avatar
          src={undefined}
          alt={comment.userId.username}
          size={isReply ? 'xs' : 'sm'}
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{comment.userId.username}</span>
            <span className="text-xs text-yt-text">{formatTimeAgo(comment.createdAt)}</span>
          </div>

          {isEditing ? (
            <div className="mt-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full bg-transparent border-b border-yt-light-gray focus:border-white outline-none py-2 text-white resize-none"
                rows={2}
              />
              <div className="flex justify-end gap-2 mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingComment(null);
                    setEditContent('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleEditComment(comment._id, isReply)}
                >
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm mt-1">{comment.content}</p>
          )}

          {/* Comment actions */}
          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={() => handleLikeComment(comment._id)}
              className={`flex items-center gap-1 text-sm ${
                isLiked ? 'text-blue-400' : 'text-yt-text hover:text-white'
              }`}
              disabled={!isAuthenticated}
            >
              <svg
                className="w-4 h-4"
                fill={isLiked ? 'currentColor' : 'none'}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                />
              </svg>
              {comment.likeCount > 0 && comment.likeCount}
            </button>

            {!isReply && isAuthenticated && (
              <button
                onClick={() => setReplyingTo(comment._id)}
                className="text-sm text-yt-text hover:text-white"
              >
                Reply
              </button>
            )}

            {canEdit && !isEditing && (
              <button
                onClick={() => {
                  setEditingComment(comment._id);
                  setEditContent(comment.content);
                }}
                className="text-sm text-yt-text hover:text-white"
              >
                Edit
              </button>
            )}

            {canDelete && (
              <button
                onClick={() => handleDeleteComment(comment._id, isReply)}
                className="text-sm text-yt-text hover:text-red-500"
              >
                Delete
              </button>
            )}
          </div>

          {/* Reply input */}
          {replyingTo === comment._id && (
            <div className="mt-3 flex gap-3">
              <Avatar src={undefined} alt={user?.username || 'User'} size="xs" />
              <div className="flex-1">
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Add a reply..."
                  className="w-full bg-transparent border-b border-yt-light-gray focus:border-white outline-none py-2 text-white resize-none"
                  rows={1}
                  autoFocus
                />
                <div className="flex justify-end gap-2 mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyContent('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSubmitComment(comment._id)}
                    isLoading={isSubmitting}
                    disabled={!replyContent.trim()}
                  >
                    Reply
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-2">
              {comment.replies.map((reply) => renderComment(reply, true))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-4">{comments.length} Comments</h3>

      {/* Add comment */}
      {isAuthenticated ? (
        <div className="flex gap-3 mb-6">
          <Avatar src={undefined} alt={user?.username || 'User'} size="sm" />
          <div className="flex-1">
            {showCommentInput ? (
              <>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="w-full bg-transparent border-b border-yt-light-gray focus:border-white outline-none py-2 text-white resize-none"
                  rows={2}
                  autoFocus
                />
                <div className="flex justify-end gap-2 mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowCommentInput(false);
                      setNewComment('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSubmitComment()}
                    isLoading={isSubmitting}
                    disabled={!newComment.trim()}
                  >
                    Comment
                  </Button>
                </div>
              </>
            ) : (
              <input
                type="text"
                placeholder="Add a comment..."
                className="w-full bg-transparent border-b border-yt-light-gray focus:border-white outline-none py-2 text-white"
                onFocus={() => setShowCommentInput(true)}
              />
            )}
          </div>
        </div>
      ) : (
        <p className="text-yt-text mb-6">
          Please <a href="/login" className="text-blue-400">sign in</a> to comment.
        </p>
      )}

      {/* Comments list */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <CommentSkeleton key={i} />
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-yt-text text-center py-8">No comments yet. Be the first to comment!</p>
      ) : (
        <div className="divide-y divide-yt-gray">
          {comments.map((comment) => renderComment(comment))}
        </div>
      )}
    </div>
  );
}
