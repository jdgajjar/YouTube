import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { generateToken, createAuthCookieHeader } from '@/lib/auth';
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  validationErrorResponse,
} from '@/lib/api-response';

interface LoginBody {
  email: string;
  password: string;
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body: LoginBody = await request.json();
    const { email, password } = body;

    // Validation
    const errors: Record<string, string> = {};

    if (!email || !email.trim()) {
      errors.email = 'Email is required';
    }

    if (!password) {
      errors.password = 'Password is required';
    }

    if (Object.keys(errors).length > 0) {
      return validationErrorResponse(errors);
    }

    // Find user with password
    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+password')
      .populate('channelId');

    if (!user) {
      return errorResponse('Invalid email or password', 401);
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return errorResponse('Invalid email or password', 401);
    }

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
      'Login successful'
    );

    response.headers.set('Set-Cookie', createAuthCookieHeader(token));

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return serverErrorResponse(error);
  }
}
