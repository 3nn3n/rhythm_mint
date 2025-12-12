import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { toastTx } from '@/components/toast-tx'
import { useSolana } from '@/components/solana/use-solana'
import { useWalletUiSigner } from '@wallet-ui/react'
import { useWalletUiSignAndSend } from '@wallet-ui/react-gill'
import { getUpdateSharesInstructionAsync } from '@project/anchor'
import { address } from 'gill'

export function useUpdateSharesMutation() {
  const { account } = useSolana()
  const signAndSend = useWalletUiSignAndSend()
  const queryClient = useQueryClient()
  
  const txSigner = useWalletUiSigner(account ? { account } : { account: undefined as any })

  return useMutation({
    mutationFn: async ({
      trackAddress,
      trackId,
      contributors,
      sharesBps,
    }: {
      trackAddress: string
      trackId: bigint
      contributors: string[]
      sharesBps: number[]
    }) => {
      if (!account) {
        throw new Error('Wallet not connected')
      }

      console.log('=== Updating Shares ===')
      console.log('Track Address:', trackAddress)
      console.log('Track ID:', trackId)
      console.log('Contributors:', contributors)
      console.log('Shares (basis points):', sharesBps)
      console.log('Authority:', account.address)

      // Convert contributors to addresses
      const contributorAddresses = contributors.map(c => address(c))

      const instruction = await getUpdateSharesInstructionAsync({
        trackId,
        newSharesBps: sharesBps,
        contributors: contributorAddresses,
        track: address(trackAddress),
        authority: txSigner,
      })

      console.log('Instruction created successfully')

      try {
        const result = await signAndSend(instruction, txSigner)
        console.log('Transaction result:', result)
        return result
      } catch (error: any) {
        console.error('Transaction error:', error)
        throw error
      }
    },
    onSuccess: (signature) => {
      toastTx(signature)
      toast.success('Revenue splits updated successfully!')
      
      console.log('Shares updated, invalidating queries...')
      queryClient.invalidateQueries({ queryKey: ['track'] })
      queryClient.invalidateQueries({ queryKey: ['tracks'] })
      
      setTimeout(() => {
        console.log('Refetching tracks after delay...')
        queryClient.refetchQueries({ queryKey: ['track'] })
      }, 1000)
    },
    onError: (error) => {
      console.error('Error updating shares:', error)
      if (error instanceof Error) {
        console.error('Error message:', error.message)
        console.error('Error stack:', error.stack)
      }
      toast.error('Failed to update revenue splits')
    },
  })
}
