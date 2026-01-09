import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { getCurrentUser } from '@/lib/auth';
import {
  successResponse,
  unauthorizedResponse,
  notFoundResponse,
  forbiddenResponse,
  serverErrorResponse,
  validationErrorResponse,
} from '@/lib/api-response';

interface UpdateUserBody {
  username?: string;
  email?: string;
}

// Get user by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const user = await User.findById(id)
      .select('-password')
      .populate('channelId');

    if (!user) {
      return notFoundResponse('User not found');
    }

    return successResponse({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        channelId: user.channelId,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    return serverErrorResponse(error);
  }
}

// Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return unauthorizedResponse();
    }

    const { id } = await params;

    // Check ownership
    if (currentUser._id.toString() !== id) {
      return forbiddenResponse('You can only update your own profile');
    }

    const body: UpdateUserBody = await request.json();
    const { username, email } = body;

    // Validation
    const errors: Record<string, string> = {};

    if (username !== undefined) {
      if (!username.trim()) {
        errors.username = 'Username cannot be empty';
      } else if (username.length < 3) {
        errors.username = 'Username must be at least 3 characters';
      } else if (username.length > 30) {
        errors.username = 'Username cannot exceed 30 characters';
      } else {
        // Check if username is taken
        const existingUser = await User.findOne({
          username,
          _id: { $ne: id },
        });
        if (existingUser) {
          errors.username = 'Username already taken';
        }
      }
    }

    if (email !== undefined) {
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        errors.email = 'Please enter a valid email';
      } else {
        // Check if email is taken
        const existingUser = await User.findOne({
          email: email.toLowerCase(),
          _id: { $ne: id },
        });
        if (existingUser) {
          errors.email = 'Email already registered';
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      return validationErrorResponse(errors);
    }

    // Update user
    const updateData: UpdateUserBody = {};
    if (username !== undefined) updateData.username = username;
    if (email !== undefined) updateData.email = email.toLowerCase();

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    )
      .select('-password')
      .populate('channelId');

    return successResponse(
      {
        user: {
          _id: updatedUser?._id,
          username: updatedUser?.username,
          email: updatedUser?.email,
          channelId: updatedUser?.channelId,
          createdAt: updatedUser?.createdAt,
        },
      },
      'Profile updated successfully'
    );
  } catch (error) {
    console.error('Update user error:', error);
    return serverErrorResponse(error);
  }
}
