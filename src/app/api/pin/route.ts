import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const mockCid = 'Qm' + Math.random().toString(36).substring(2, 15)
    
    return NextResponse.json({ cid: mockCid })
  } catch (error) {
    console.error('Error in /api/pin:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}
