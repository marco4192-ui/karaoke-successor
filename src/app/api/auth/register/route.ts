// User Registration API
// Handles email/password registration with verification

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validatePassword, authConfig } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, country } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: 'Password requirements not met', details: passwordValidation.errors },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate sync code for player
    const syncCode = generateSyncCode();

    // Create user and player in transaction
    const user = await db.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          password: hashedPassword,
          name: name || 'Singer',
          emailVerified: authConfig.email.requireVerification ? null : new Date(),
        },
      });

      // Create player profile
      await tx.player.create({
        data: {
          userId: newUser.id,
          name: name || 'Singer',
          country: country || 'DE',
          syncCode,
        },
      });

      // Create default settings
      await tx.userSettings.create({
        data: {
          userId: newUser.id,
        },
      });

      return newUser;
    });

    // If email verification is required, create verification token
    if (authConfig.email.requireVerification) {
      const verificationToken = uuidv4();
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await db.verificationToken.create({
        data: {
          identifier: normalizedEmail,
          token: verificationToken,
          expires,
        },
      });

      // TODO: Send verification email
      // For now, return the token for testing
      return NextResponse.json({
        message: 'Registration successful. Please check your email to verify your account.',
        userId: user.id,
        // Remove in production:
        verificationToken: process.env.NODE_ENV === 'development' ? verificationToken : undefined,
      });
    }

    return NextResponse.json({
      message: 'Registration successful',
      userId: user.id,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Generate unique sync code
function generateSyncCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
