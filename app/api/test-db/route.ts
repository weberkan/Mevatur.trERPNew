import { NextResponse } from 'next/server'
// DATABASE REMOVED - TO BE REDESIGNED

export async function GET() {
  return NextResponse.json({
    message: 'Veritabanı sistemi yeniden tasarlanıyor',
    status: 'database_removed'
  })
}
