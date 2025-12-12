import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { toastTx } from '@/components/toast-tx'
import { useSolana } from '@/components/solana/use-solana'
import { useWalletUiSigner } from '@wallet-ui/react'
import { useWalletUiSignAndSend } from '@wallet-ui/react-gill'
import { getEscrowDepositInstructionAsync } from '@project/anchor'
import { address } from 'gill'

export function useEscrowDepositMutation() {
  const { account } = useSolana()
  const signAndSend = useWalletUiSignAndSend()
  const queryClient = useQueryClient()
  const txSigner = useWalletUiSigner(account ? { account } : undefined)

  return useMutation({
    mutationFn: async ({
      trackAddress,
      trackId,
      amount,
      authorityAddress,
      escrowTokenAccount,
      payerTokenAccount,
      mint,
    }: {
      trackAddress: string
      trackId: bigint
      amount: bigint
      authorityAddress: string
      escrowTokenAccount: string
      payerTokenAccount: string
      mint: string
    }) => {
      if (!account || !txSigner) {
        throw new Error('Wallet not connected')
      }

      console.log('=== Depositing to Escrow ===')
      console.log('Track Address:', trackAddress)
      console.log('Track ID:', trackId)
      console.log('Amount:', amount)
      console.log('Authority:', authorityAddress)
      console.log('Escrow Token Account:', escrowTokenAccount)
      console.log('Payer Token Account:', payerTokenAccount)
      console.log('Mint:', mint)

      const instruction = await getEscrowDepositInstructionAsync({
        amount,
        trackId,
        authority: address(authorityAddress),
        payer: txSigner,
        track: address(trackAddress),
        escrowTokenAccount: address(escrowTokenAccount),
        payerTokenAccount: address(payerTokenAccount),
        mint: address(mint),
      })

      console.log('Instruction created successfully')

      try {
        const result = await signAndSend(instruction, txSigner)
        console.log('Transaction result:', result)
        return result
      } catch (error: any) {
        console.error('Transaction error:', error)
        
        // Try to extract more detailed error info
        if (error?.message) {
          console.error('Error message:', error.message)
        }
        if (error?.logs) {
          console.error('Transaction logs:', error.logs)
        }
        
        // Provide user-friendly error messages
        const errorMsg = error?.message || String(error)
        if (errorMsg.includes('insufficient funds') || errorMsg.includes('InsufficientFunds')) {
          throw new Error('Insufficient USDC balance in your wallet')
        } else if (errorMsg.includes('AccountNotFound') || errorMsg.includes('could not find account')) {
          throw new Error('Token account not found. Make sure you have a USDC token account and the escrow account is created.')
        } else if (errorMsg.includes('InvalidTokenAccountOwner')) {
          throw new Error('Invalid escrow token account owner')
        }
        
        throw error
      }
    },
    onSuccess: (signature) => {
      toastTx(signature)
      toast.success('Deposited to escrow successfully!')
      
      queryClient.invalidateQueries({ queryKey: ['track'] })
      queryClient.invalidateQueries({ queryKey: ['escrow'] })
    },
    onError: (error) => {
      console.error('Error depositing to escrow:', error)
      
      let errorMessage = 'Failed to deposit to escrow'
      if (error instanceof Error) {
        console.error('Error message:', error.message)
        errorMessage = error.message
      }
      
      toast.error(errorMessage)
    },
  })
}
