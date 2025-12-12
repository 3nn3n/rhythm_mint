import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useSolana } from '@/components/solana/use-solana'

export function useInitializeContributorAccountsMutation() {
  const { account } = useSolana()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      contributors,
      mint,
    }: {
      contributors: number[][] // Array of contributor pubkey bytes
      mint: string
    }) => {
      if (!account) {
        throw new Error('Wallet not connected')
      }

      const { Connection, PublicKey, TransactionMessage, VersionedTransaction } = await import('@solana/web3.js')
      const { createAssociatedTokenAccountInstruction, getAssociatedTokenAddressSync } = await import('@solana/spl-token')

      console.log('=== Initializing Contributor Token Accounts ===')
      console.log('Contributors:', contributors.length)
      console.log('Mint:', mint)

      const connection = new Connection('http://127.0.0.1:8899', 'confirmed')
      const mintPubkey = new PublicKey(mint)
      const payerPubkey = new PublicKey(account.address)

      // Check which accounts need to be created
      const instructions = []
      for (let i = 0; i < contributors.length; i++) {
        const contributorPubkey = new PublicKey(Buffer.from(contributors[i]))
        const ata = getAssociatedTokenAddressSync(mintPubkey, contributorPubkey)
        
        console.log(`Checking contributor ${i}: ${contributorPubkey.toBase58()}`)
        console.log(`ATA: ${ata.toBase58()}`)
        
        const accountInfo = await connection.getAccountInfo(ata)
        if (!accountInfo) {
          console.log(`Creating token account for contributor ${i}`)
          const createIx = createAssociatedTokenAccountInstruction(
            payerPubkey, // payer
            ata, // ata address
            contributorPubkey, // owner
            mintPubkey // mint
          )
          instructions.push(createIx)
        } else {
          console.log(`Contributor ${i} token account already exists`)
        }
      }

      if (instructions.length === 0) {
        toast.info('All contributor token accounts already exist')
        return null
      }

      console.log(`Creating ${instructions.length} token accounts...`)

      // Create and send transaction
      const { blockhash } = await connection.getLatestBlockhash()
      
      const message = new TransactionMessage({
        payerKey: payerPubkey,
        recentBlockhash: blockhash,
        instructions,
      }).compileToV0Message()
      
      const tx = new VersionedTransaction(message)
      
      // Sign transaction using wallet
      const solanaWallet = (window as { solana?: { signTransaction?: (tx: VersionedTransaction) => Promise<VersionedTransaction> } }).solana
      if (!solanaWallet?.signTransaction) {
        throw new Error('Wallet does not support signing transactions')
      }
      
      const signedTx = await solanaWallet.signTransaction(tx)
      
      // Send transaction
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      })
      
      console.log('Transaction signature:', signature)
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed')
      
      return signature
    },
    onSuccess: (signature) => {
      if (signature) {
        toast.success(`Created contributor token accounts! Signature: ${signature.slice(0, 8)}...`)
      }
      queryClient.invalidateQueries({ queryKey: ['track'] })
    },
    onError: (error) => {
      console.error('Error initializing contributor accounts:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create token accounts')
    },
  })
}
