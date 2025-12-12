import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { toastTx } from '@/components/toast-tx'
import { useSolana } from '@/components/solana/use-solana'
import { useWalletUiSigner } from '@wallet-ui/react'
import { useWalletUiSignAndSend } from '@wallet-ui/react-gill'
import { getCreateEscrowAtaInstructionAsync } from '@project/anchor'
import { address } from 'gill'

export function useCreateEscrowAtaMutation() {
  const { account } = useSolana()
  const signAndSend = useWalletUiSignAndSend()
  const queryClient = useQueryClient()
  
  const txSigner = useWalletUiSigner(account ? { account } : { account: undefined as any })

  return useMutation({
    mutationFn: async ({
      trackAddress,
      trackId,
      authorityAddress,
      escrowTokenAccount,
      mint,
    }: {
      trackAddress: string
      trackId: bigint
      authorityAddress: string
      escrowTokenAccount: string
      mint: string
    }) => {
      if (!account) {
        throw new Error('Wallet not connected')
      }

      console.log('=== Creating Escrow ATA ===')
      console.log('Track Address:', trackAddress)
      console.log('Track ID:', trackId)
      console.log('Authority:', authorityAddress)
      console.log('Escrow Token Account:', escrowTokenAccount)
      console.log('Mint:', mint)

      try {
        const instruction = await getCreateEscrowAtaInstructionAsync({
          trackId,
          authority: address(authorityAddress),
          payer: txSigner,
          track: address(trackAddress),
          escrowTokenAccount: address(escrowTokenAccount),
          mint: address(mint),
        })

        console.log('Instruction created successfully')
        console.log('Instruction accounts:', instruction.accounts?.length)

        const result = await signAndSend(instruction, txSigner)
        console.log('Transaction result:', result)
        return result
      } catch (error: any) {
        console.error('Transaction error:', error)
        
        if (error?.message) {
          console.error('Error message:', error.message)
        }
        if (error?.logs) {
          console.error('Transaction logs:', error.logs)
        }
        if (error?.cause) {
          console.error('Error cause:', error.cause)
        }
        if (error?.stack) {
          console.error('Error stack:', error.stack)
        }
        
        // Check if account already exists
        if (error?.message?.includes('already in use') || error?.logs?.some((log: string) => log.includes('already in use'))) {
          throw new Error('Escrow token account already exists')
        }
        
        throw error
      }
    },
    onSuccess: (signature) => {
      toastTx(signature)
      toast.success('Escrow token account created!')
      
      queryClient.invalidateQueries({ queryKey: ['track'] })
    },
    onError: (error) => {
      console.error('Error creating escrow ATA:', error)
      
      let errorMessage = 'Failed to create escrow account'
      if (error instanceof Error) {
        console.error('Error message:', error.message)
        errorMessage = error.message
      }
      
      toast.error(errorMessage)
    },
  })
}
