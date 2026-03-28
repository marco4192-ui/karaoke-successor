// Email Verification API
// Handles email verification for new accounts

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, email } = body;

    if (!token || !email) {
      return NextResponse.json(
        { error: 'Token and email are required' },
        { status: 400 }
      );
    }

    // Find verification token
    const verificationToken = await db.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
      );
    }

    // Check if token matches email
    if (verificationToken.identifier !== email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Token does not match email address' },
        { status: 400 }
      );
    }

    // Check if token expired
    if (verificationToken.expires < new Date()) {
      // Delete expired token
      await db.verificationToken.delete({ where: { token } });
      return NextResponse.json(
        { error: 'Verification token has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Verify user email
    await db.$transaction([
      db.user.update({
        where: { email: email.toLowerCase() },
        data: { emailVerified: new Date() },
      }),
      db.verificationToken.delete({ where: { token } }),
    ]);

    return NextResponse.json({
      message: 'Email verified successfully. You can now sign in.',
    });
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Resend verification email
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if user exists or not
      return NextResponse.json({
        message: 'If an account exists with this email, a new verification email has been sent.',
      });
    }

    if (user.emailVerified) {
      return NextResponse.json({
        message: 'This email is already verified.',
      });
    }

    // Delete old verification tokens
    await db.verificationToken.deleteMany({
      where: { identifier: email.toLowerCase() },
    });

    // Create new verification token
    const crypto = await import('crypto');
    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await db.verificationToken.create({
      data: {
        identifier: email.toLowerCase(),
        token,
        expires,
      },
    });

    // TODO: Send verification email
    // For development, return the token
    return NextResponse.json({
      message: 'If an account exists with this email, a new verification email has been sent.',
      // Remove in production:
      verificationToken: process.env.NODE_ENV === 'development' ? token : undefined,
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
