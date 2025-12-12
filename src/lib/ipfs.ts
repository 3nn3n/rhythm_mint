import axios from 'axios'

export async function uploadToPinata(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)

  try {
    const res = await axios.post('/api/pin', form, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return res.data.cid
  } catch (error) {
    console.error('Error uploading to Pinata:', error)
    throw new Error('Failed to upload file to IPFS')
  }
}
