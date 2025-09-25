import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const envVars = {
      JWT_SECRET: !!process.env.JWT_SECRET ? 'SET' : 'MISSING',
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET ? 'SET' : 'MISSING',
      NEXTAUTH_URL: !!process.env.NEXTAUTH_URL ? 'SET' : 'MISSING',
      DB_HOST: !!process.env.DB_HOST ? 'SET' : 'MISSING',
      DB_USER: !!process.env.DB_USER ? 'SET' : 'MISSING',
      DB_PASSWORD: !!process.env.DB_PASSWORD ? 'SET' : 'MISSING',
      DB_NAME: !!process.env.DB_NAME ? 'SET' : 'MISSING',
      NODE_ENV: process.env.NODE_ENV || 'MISSING'
    };

    return NextResponse.json({
      success: true,
      environment: envVars,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Auth diagnostics error:', error);
    return NextResponse.json({ 
      error: 'Diagnostics check failed',
      success: false
    }, { status: 500 });
  }
}