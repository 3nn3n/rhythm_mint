import { useQuery } from '@tanstack/react-query'
import { useWalletUiGill } from '@wallet-ui/react-gill'
import { address, getProgramDerivedAddress, getAddressEncoder } from 'gill'
import { MUZICA_PROGRAM_ADDRESS } from '@project/anchor'

export function useMintedNftsQuery({ 
  trackAddress, 
  contributorCount 
}: { 
  trackAddress: string
  contributorCount: number 
}) {
  const client = useWalletUiGill()

  return useQuery({
    queryKey: ['minted-nfts', trackAddress],
    queryFn: async () => {
      console.log('Fetching minted NFTs for track:', trackAddress)
      console.log('Contributor count:', contributorCount)

      const mintedNfts = []

      // Check each possible NFT index (0 to contributorCount-1)
      for (let i = 0; i < contributorCount; i++) {
        try {
          const nftIndexBytes = new ArrayBuffer(8)
          new DataView(nftIndexBytes).setBigUint64(0, BigInt(i), true)
          
          const [mintPda] = await getProgramDerivedAddress({
            programAddress: address(MUZICA_PROGRAM_ADDRESS),
            seeds: [
              new TextEncoder().encode('stem_mint'),
              getAddressEncoder().encode(address(trackAddress)),
              new Uint8Array(nftIndexBytes),
            ],
          })

          // Check if this mint exists
          const mintAccount = await client.rpc.getAccountInfo(mintPda, { encoding: 'base64' }).send()
          
          if (mintAccount.value) {
            console.log(`NFT ${i} exists at:`, mintPda)
            
            // Get mint data to find supply
            const data = Buffer.from(mintAccount.value.data[0], 'base64')
            // Mint supply is at bytes 36-44 (u64 little endian)
            let supply = BigInt(0)
            for (let j = 0; j < 8; j++) {
              supply += BigInt(data[36 + j]) << BigInt(j * 8)
            }
            
            mintedNfts.push({
              index: i,
              mintAddress: mintPda.toString(),
              supply: supply.toString(),
            })
          } else {
            console.log(`NFT ${i} not minted yet`)
          }
        } catch (error) {
          console.error(`Error checking NFT ${i}:`, error)
        }
      }

      console.log('Total minted NFTs:', mintedNfts.length)
      return mintedNfts
    },
    enabled: !!trackAddress && contributorCount > 0,
  })
}
