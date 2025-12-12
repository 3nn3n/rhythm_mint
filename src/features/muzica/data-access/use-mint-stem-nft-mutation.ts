import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { toastTx } from '@/components/toast-tx'
import { useSolana } from '@/components/solana/use-solana'
import { useWalletUiSigner } from '@wallet-ui/react'
import { useWalletUiSignAndSend, useWalletUiGill } from '@wallet-ui/react-gill'
import { getMintStemNftInstructionAsync, MUZICA_PROGRAM_ADDRESS } from '@project/anchor'
import { address, getProgramDerivedAddress, getAddressEncoder } from 'gill'

export function useMintStemNftMutation() {
  const { account } = useSolana()
  const signAndSend = useWalletUiSignAndSend()
  const queryClient = useQueryClient()
  const client = useWalletUiGill()
  
  const txSigner = useWalletUiSigner(account ? { account } : undefined)

  return useMutation({
    mutationFn: async ({
      trackAddress,
      trackId,
      nftIndex,
    }: {
      trackAddress: string
      trackId: bigint
      nftIndex: number
    }) => {
      if (!account) {
        throw new Error('Wallet not connected')
      }
      
      console.log('=== Minting Stem NFT ===')
      console.log('Track Address:', trackAddress)
      console.log('Track ID:', trackId)
      console.log('NFT Index:', nftIndex)
      console.log('Authority (wallet):', account.address)
      
      // Derive the mint PDA to check if it already exists
      const trackIdBytes = new ArrayBuffer(8)
      new DataView(trackIdBytes).setBigUint64(0, trackId, true)
      const nftIndexBytes = new ArrayBuffer(8)
      new DataView(nftIndexBytes).setBigUint64(0, BigInt(nftIndex), true)
      
      const [mintPda] = await getProgramDerivedAddress({
        programAddress: address(MUZICA_PROGRAM_ADDRESS),
        seeds: [
          new TextEncoder().encode('stem_mint'),
          getAddressEncoder().encode(address(trackAddress)),
          new Uint8Array(nftIndexBytes),
        ],
      })
      
      console.log('Expected Mint PDA:', mintPda)
      
      // Check if mint PDA already exists
      try {
        const mintAccount = await client.rpc.getAccountInfo(mintPda, { encoding: 'base64' }).send()
        if (mintAccount.value) {
          console.error('ERROR: Mint PDA already exists!', mintPda)
          throw new Error(`Stem NFT already minted for contributor index ${nftIndex}. Each contributor can only mint once.`)
        }
      } catch {
        // Account doesn't exist - this is expected
        console.log('Mint PDA does not exist yet - good to proceed')
      }

      // The track PDA constraint in Rust uses authority.key() which expects the CURRENT signer,
      // but we need to pass the track address directly since it was created with a different authority.
      // We cannot use auto-derivation here - must pass all accounts explicitly.
      const instruction = await getMintStemNftInstructionAsync({
        trackId,
        nftIndex,
        payer: txSigner,
        authority: txSigner,
        track: address(trackAddress), // Pass track address directly - don't auto-derive
        // mint, recipientTokenAccount will be auto-derived
        // token programs will be auto-filled
      })

      console.log('Instruction created successfully')
      console.log('Instruction accounts:', instruction.accounts?.length || 0)
      console.log('Instruction data length:', instruction.data?.length || 0)

      try {
        const result = await signAndSend(instruction, txSigner)
        console.log('Transaction result:', result)
        return result
      } catch (error) {
        console.error('Transaction error:', error)
        throw error
      }
    },
    onSuccess: (signature) => {
      toastTx(signature)
      toast.success('Stem NFT minted successfully!')
      
      console.log('Stem NFT minted, invalidating queries...')
      queryClient.invalidateQueries({ queryKey: ['track'] })
      
      setTimeout(() => {
        console.log('Refetching track after delay...')
        queryClient.refetchQueries({ queryKey: ['track'] })
      }, 1000)
    },
    onError: (error) => {
      console.error('Error minting stem NFT:', error)
      if (error instanceof Error) {
        console.error('Error message:', error.message)
        console.error('Error stack:', error.stack)
      }
      toast.error('Failed to mint stem NFT')
    },
  })
}
