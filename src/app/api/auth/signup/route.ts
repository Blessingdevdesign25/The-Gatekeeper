import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { signupSchema } from '@/lib/validation';
import { getSession } from '@/lib/auth';
import { ApiResponse } from '@/types';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await req.json();
    const result = signupSchema.safeParse(body);

    if (!result.success) {
      const fields: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) fields[issue.path[0].toString()] = issue.message;
      });

      return NextResponse.json(
        { success: false, error: 'Validation failed', code: 'VALIDATION_ERROR', fields },
        { status: 400 }
      );
    }

    const { name, email, password } = result.data;
    const hashedPassword = await hashPassword(password);

    try {
      const user = await prisma.user.create({
        data: { name, email, password: hashedPassword },
      });

      // Set session cookie
      const session = await getSession();
      session.userId = user.id;
      session.name = user.name;
      session.email = user.email;
      session.isLoggedIn = true;
      await session.save();

      return NextResponse.json({ success: true }, { status: 201 });
    } catch (dbError) {
      if (dbError instanceof Prisma.PrismaClientKnownRequestError && dbError.code === 'P2002') {
        return NextResponse.json(
          {
            success: false,
            error: 'Email already in use',
            code: 'EMAIL_IN_USE',
            fields: { email: 'This email is already taken' },
          },
          { status: 409 }
        );
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
