import { useQuery } from '@tanstack/react-query'
import { useWalletUiGill } from '@wallet-ui/react-gill'
import { MUZICA_PROGRAM_ADDRESS } from '@project/anchor'
import { address, getAddressEncoder } from 'gill'

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

/**
 * Query hook to fetch tracks where the current wallet is a contributor
 * This allows contributors to see and mint NFTs for tracks they're part of
 */
export function useContributorTracksQuery({ walletAddress }: { walletAddress?: string }) {
  const client = useWalletUiGill()

  return useQuery({
    queryKey: ['contributor-tracks', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return []

      console.log('Fetching tracks where wallet is contributor:', walletAddress)

      // Encode wallet address to bytes for comparison
      const addressEncoder = getAddressEncoder()
      const walletBytes = addressEncoder.encode(address(walletAddress))
      const walletBase64 = Buffer.from(walletBytes).toString('base64')
      
      console.log('Wallet as base64:', walletBase64)

      // Fetch ALL Track accounts (no filter on authority)
      const response = await client.rpc.getProgramAccounts(
        address(MUZICA_PROGRAM_ADDRESS),
        {
          encoding: 'base64',
        }
      ).send()

      console.log('Total tracks in program:', response.length)

      // Decode and filter tracks where user is a contributor
      const tracks = response
        .map((account: any) => {
          try {
            // Decode base64 data
            const dataBase64 = account.account.data[0]
            const dataBytes = Uint8Array.from(atob(dataBase64), c => c.charCodeAt(0))
            
            const decoded = decodeTrackManual(dataBytes)
            
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
        })
        .filter((track): track is NonNullable<typeof track> => {
          if (!track) return false
          
          // Check if current wallet is in the contributors array
          const isAuthority = track.account.data.authority === walletBase64
          const isContributor = track.account.data.contributors.some(
            (contributor: number[]) => {
              const contributorBase64 = Buffer.from(contributor).toString('base64')
              return contributorBase64 === walletBase64
            }
          )
          
          const match = isAuthority || isContributor
          if (match) {
            console.log('Found track for wallet:', track.pubkey, 'isAuthority:', isAuthority, 'isContributor:', isContributor)
          }
          
          return match
        })

      console.log('Tracks where wallet is contributor:', tracks.length)
      return tracks
    },
    enabled: !!walletAddress,
  })
}
