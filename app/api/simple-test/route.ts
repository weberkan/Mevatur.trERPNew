import { NextResponse } from 'next/server'
// DATABASE REMOVED - TO BE REDESIGNED

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Basit test çalışıyor',
    status: 'database_removed',
    timestamp: new Date().toISOString()
  })
}
