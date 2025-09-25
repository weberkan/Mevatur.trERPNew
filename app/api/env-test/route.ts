import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    jwt_secret: process.env.JWT_SECRET ? `Set (${process.env.JWT_SECRET.substring(0, 10)}...)` : 'Missing',
    nextauth_secret: process.env.NEXTAUTH_SECRET ? `Set (${process.env.NEXTAUTH_SECRET.substring(0, 10)}...)` : 'Missing',
    nextauth_url: process.env.NEXTAUTH_URL || 'Missing',
    node_env: process.env.NODE_ENV,
    database_url: process.env.DATABASE_URL ? `Set (${process.env.DATABASE_URL.substring(0, 20)}...)` : 'Missing'
  })
}