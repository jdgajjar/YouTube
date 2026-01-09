import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { generateToken, createAuthCookieHeader } from '@/lib/auth';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  validationErrorResponse,
} from '@/lib/api-response';

interface RegisterBody {
  email: string;
  username: string;
  password: string;
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body: RegisterBody = await request.json();
    const { email, username, password } = body;

    // Validation
    const errors: Record<string, string> = {};

    if (!email || !email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      errors.email = 'Please enter a valid email';
    }

    if (!username || !username.trim()) {
      errors.username = 'Username is required';
    } else if (username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    } else if (username.length > 30) {
      errors.username = 'Username cannot exceed 30 characters';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (Object.keys(errors).length > 0) {
      return validationErrorResponse(errors);
    }

    // Check if user exists
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return errorResponse('Email already registered', 409);
    }

    const existingUsername = await User.findOne({
      username: username.toLowerCase(),
    });
    if (existingUsername) {
      return errorResponse('Username already taken', 409);
    }

    // Create user
    const user = await User.create({
      email: email.toLowerCase(),
      username,
      password,
    });

    // Generate token
    const token = generateToken(user._id.toString(), user.email);

    // Create response with cookie
    const response = successResponse(
      {
        user: {
          _id: user._id,
          email: user.email,
          username: user.username,
          channelId: user.channelId,
          watchHistory: user.watchHistory,
          watchLater: user.watchLater,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        token,
      },
      'Registration successful',
      201
    );

    response.headers.set('Set-Cookie', createAuthCookieHeader(token));

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return serverErrorResponse(error);
  }
}
