import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { toastTx } from '@/components/toast-tx'
import { useSolana } from '@/components/solana/use-solana'
import { useWalletUiSigner } from '@wallet-ui/react'
import { useWalletUiSignAndSend, useWalletUiGill } from '@wallet-ui/react-gill'
import { getInitializeTrackInstruction, MUZICA_PROGRAM_ADDRESS } from '@project/anchor'
import { address, getProgramDerivedAddress, getAddressEncoder } from 'gill'

export function useInitializeTrackMutation() {
  const { account } = useSolana()
  const signAndSend = useWalletUiSignAndSend()
  const queryClient = useQueryClient()
  
  // Always call the hook to satisfy React Hooks rules
  // Pass undefined if account is not available - will check in mutationFn
  const txSigner = useWalletUiSigner(account ? { account } : undefined)

  return useMutation({
    mutationFn: async ({
      trackId,
      title,
      cid,
      masterHash,
      contributors,
      sharesBps,
    }: {
      trackId: bigint
      title: string
      cid: string
      masterHash: Uint8Array
      contributors: string[]
      sharesBps: number[]
    }) => {
      if (!account) {
        throw new Error('Wallet not connected')
      }
      // Derive the track PDA
      // Seeds: [b"track", authority, track_id]
      const trackIdBytes = new Uint8Array(8)
      const view = new DataView(trackIdBytes.buffer)
      view.setBigUint64(0, trackId, true) // true for little-endian

      // Encode authority address to bytes (32 bytes)
      const authorityAddress = address(account.address)
      const authorityBytes = getAddressEncoder().encode(authorityAddress)

      const [trackPda] = await getProgramDerivedAddress({
        programAddress: address(MUZICA_PROGRAM_ADDRESS),
        seeds: [
          new TextEncoder().encode('track'),
          authorityBytes,
          trackIdBytes,
        ],
      })

      const instruction = getInitializeTrackInstruction({
        trackId,
        title,
        cid,
        masterHash,
        contributors: contributors.map((contributorAddress) => address(contributorAddress)),
        sharesBps,
        authority: txSigner,
        track: trackPda,
        systemProgram: address('11111111111111111111111111111111'),
      })

      console.log('Track PDA:', trackPda)
      console.log('Instruction:', instruction)
      console.log('Instruction accounts:', instruction.accounts.map((acc: { address: string; role: number }) => ({
        address: acc.address,
        role: acc.role,
      })))
      console.log('Instruction data length:', instruction.data.length)
      console.log('Track ID:', trackId)
      console.log('Contributors:', contributors)
      console.log('Shares:', sharesBps)
      console.log('Authority:', account.address)

      try {
        const result = await signAndSend(instruction, txSigner)
        console.log('Transaction result:', result)
        return result
      } catch (error) {
        console.error('Transaction error:', error)
        
        // Try to parse the error string for more details
        const errorStr = String(error)
        console.error('Error as string:', errorStr)
        
        throw error
      }
    },
    onSuccess: (signature) => {
      toastTx(signature)
      toast.success('Track created successfully!')
      
      console.log('Track created, invalidating queries...')
      // Invalidate tracks query to refetch the list
      queryClient.invalidateQueries({ queryKey: ['tracks'] })
      
      // Force refetch after a short delay to ensure blockchain state is updated
      setTimeout(() => {
        console.log('Refetching tracks after delay...')
        queryClient.refetchQueries({ queryKey: ['tracks'] })
      }, 1000)
    },
    onError: (error) => {
      console.error('Error creating track:', error)
      // Log more details
      if (error instanceof Error) {
        console.error('Error message:', error.message)
        console.error('Error stack:', error.stack)
      }
      toast.error('Failed to create track')
    },
  })
}
