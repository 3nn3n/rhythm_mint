import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Upload to Pinata
    const pinataFormData = new FormData()
    pinataFormData.append('file', file)

    // Check which auth method is available
    const authHeader = process.env.PINATA_JWT 
      ? { 'Authorization': `Bearer ${process.env.PINATA_JWT}` }
      : {
          'pinata_api_key': process.env.PINATA_API_KEY!,
          'pinata_secret_api_key': process.env.PINATA_SECRET_KEY!,
        }

    const pinataResponse = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: authHeader,
      body: pinataFormData,
    })

    if (!pinataResponse.ok) {
      const error = await pinataResponse.text()
      return NextResponse.json({ error: `Pinata upload failed: ${error}` }, { status: 500 })
    }

    const data = await pinataResponse.json()
    return NextResponse.json({ cid: data.IpfsHash })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
