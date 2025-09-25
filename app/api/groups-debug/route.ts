import { NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
})

export async function GET() {
  let client
  
  try {
    client = await pool.connect()
    
    // Get groups from database
    const result = await client.query(`
      SELECT 
        id,
        name,
        type,
        start_date,
        end_date,
        capacity,
        currency,
        status,
        created_at
      FROM groups 
      ORDER BY created_at DESC
    `)
    
    // Return in simplified format for frontend debugging
    const groups = result.rows.map((row, index) => ({
      id: row.id,
      name: row.name || `Grup ${index + 1}`,
      type: row.type || 'Umre',
      startDate: row.start_date,
      endDate: row.end_date,
      capacity: row.capacity || 50,
      currency: row.currency || 'TRY',
      status: row.status || 'planning',
      participantCount: 0,
      totalPaid: 0,
      totalRemaining: 0
    }))

    return NextResponse.json({
      success: true,
      data: groups,
      pagination: {
        page: 1,
        limit: 10,
        totalItems: groups.length,
        totalPages: 1
      },
      debug: {
        dbRows: result.rows.length,
        returnedGroups: groups.length,
        firstGroupName: groups[0]?.name,
        allGroupNames: groups.map(g => g.name)
      }
    })

  } catch (error) {
    console.error('Groups debug error:', error)
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 })
  } finally {
    if (client) {
      client.release()
    }
  }
}