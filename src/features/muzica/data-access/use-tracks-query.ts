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

export function useTracksQuery({ authority }: { authority?: string }) {
  const client = useWalletUiGill()

  return useQuery({
    queryKey: ['tracks', authority],
    queryFn: async () => {
      if (!authority) return []

      console.log('Fetching tracks for authority:', authority)

      // Fetch all Track accounts for this authority using RPC getProgramAccounts
      const response = await client.rpc.getProgramAccounts(
        address(MUZICA_PROGRAM_ADDRESS),
        {
          encoding: 'base64',
          filters: [
            {
              memcmp: {
                offset: BigInt(8), 
                bytes: authority,
              },
            },
          ],
        }
      ).send()

      console.log('Raw response:', response)
      console.log('Number of tracks found:', response.value.length)

      // Decode the accounts manually
      const tracks = response.value.map((account: { pubkey: string; account: { data: [string, string] } }) => {
        console.log('Decoding account:', account.pubkey)
        try {
          // Decode base64 data
          const dataBase64 = account.account.data[0]
          const dataBytes = Uint8Array.from(atob(dataBase64), c => c.charCodeAt(0))
          
          const decoded = decodeTrackManual(dataBytes)
          console.log('Successfully decoded:', account.pubkey, decoded)
          
          return {
            pubkey: account.pubkey,
            account: {
              data: decoded
            },
          }
        } catch (error) {
          console.error('Error decoding account:', account.pubkey, error)
          return null
        }
      }).filter(Boolean)

      console.log('Decoded tracks:', tracks)
      return tracks
    },
    enabled: !!authority,
  })
}
