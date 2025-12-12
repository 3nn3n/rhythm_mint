import { useQuery } from '@tanstack/react-query'
import { useWalletUiGill } from '@wallet-ui/react-gill'
import { MUZICA_PROGRAM_ADDRESS } from '@project/anchor'
import { address } from 'gill'

// Manual decoder for Track account
function decodeTrackManual(data: Uint8Array) {
  // Skip discriminator (first 8 bytes)
  let offset = 8
  
  // Read authority (32 bytes)
  const authority = Array.from(data.slice(offset, offset + 32))
  offset += 32
  
  // Read track_id (8 bytes, u64 little endian)
  const trackIdBytes = data.slice(offset, offset + 8)
  const trackId = new DataView(trackIdBytes.buffer, trackIdBytes.byteOffset).getBigUint64(0, true)
  offset += 8
  
  // Read title (String with 4-byte length prefix)
  const titleLen = new DataView(data.buffer, data.byteOffset + offset).getUint32(0, true)
  offset += 4
  const title = new TextDecoder().decode(data.slice(offset, offset + titleLen))
  offset += titleLen
  
  // Read cid (String with 4-byte length prefix)
  const cidLen = new DataView(data.buffer, data.byteOffset + offset).getUint32(0, true)
  offset += 4
  const cid = new TextDecoder().decode(data.slice(offset, offset + cidLen))
  offset += cidLen
  
  // Read master_hash (32 bytes)
  const masterHash = Array.from(data.slice(offset, offset + 32))
  offset += 32
  
  // Read contributors (Vec with 4-byte length prefix)
  const contributorsLen = new DataView(data.buffer, data.byteOffset + offset).getUint32(0, true)
  offset += 4
  const contributors = []
  for (let i = 0; i < contributorsLen; i++) {
    contributors.push(Array.from(data.slice(offset, offset + 32)))
    offset += 32
  }
  
  // Read shares (Vec<u16> with 4-byte length prefix)
  const sharesLen = new DataView(data.buffer, data.byteOffset + offset).getUint32(0, true)
  offset += 4
  const shares = []
  for (let i = 0; i < sharesLen; i++) {
    shares.push(new DataView(data.buffer, data.byteOffset + offset).getUint16(0, true))
    offset += 2
  }
  
  // Read stem_mints (Vec<Pubkey> with 4-byte length prefix)
  const stemMintsLen = new DataView(data.buffer, data.byteOffset + offset).getUint32(0, true)
  offset += 4
  const stemMints = []
  for (let i = 0; i < stemMintsLen; i++) {
    stemMints.push(Array.from(data.slice(offset, offset + 32)))
    offset += 32
  }
  
  return {
    authority: Buffer.from(authority).toString('base64'),
    trackId,
    title,
    cid,
    masterHash,
    contributors,
    shares,
    stemMints,
  }
}

export function useTrackQuery({ trackAddress }: { trackAddress?: string }) {
  const client = useWalletUiGill()

  return useQuery({
    queryKey: ['track', trackAddress],
    queryFn: async () => {
      if (!trackAddress) return null

      console.log('Fetching track:', trackAddress)

      try {
        // Fetch the account data
        const response = await client.rpc.getAccountInfo(
          address(trackAddress),
          {
            encoding: 'base64',
          }
        ).send()

        if (!response.value) {
          console.error('Track account not found')
          return null
        }

        console.log('Track account data:', response.value)

        // Decode base64 data
        const dataBase64 = response.value.data[0]
        const dataBytes = Uint8Array.from(atob(dataBase64), c => c.charCodeAt(0))
        
        const decoded = decodeTrackManual(dataBytes)
        console.log('Successfully decoded track:', decoded)
        
        return {
          pubkey: trackAddress,
          data: decoded
        }
      } catch (error) {
        console.error('Error fetching track:', error)
        return null
      }
    },
    enabled: !!trackAddress,
  })
}
