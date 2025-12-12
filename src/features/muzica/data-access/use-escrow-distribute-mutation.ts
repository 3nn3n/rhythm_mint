import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { toastTx } from '@/components/toast-tx'
import { useSolana } from '@/components/solana/use-solana'
import { useWalletUiSigner } from '@wallet-ui/react'
import { useWalletUiSignAndSend, useWalletUiGill } from '@wallet-ui/react-gill'
import { getEscrowDistributeInstructionAsync } from '@project/anchor'
import { address, getAddressEncoder } from 'gill'

export function useEscrowDistributeMutation() {
  const { account } = useSolana()
  const signAndSend = useWalletUiSignAndSend()
  const queryClient = useQueryClient()
  const client = useWalletUiGill()
  
  const txSigner = useWalletUiSigner(account ? { account } : { account: undefined as any })

  return useMutation({
    mutationFn: async ({
      trackAddress,
      trackId,
      amount,
      escrowTokenAccount,
      contributors,
    }: {
      trackAddress: string
      trackId: bigint
      amount: bigint
      escrowTokenAccount: string
      contributors: number[][] // Array of contributor pubkey bytes
    }) => {
      if (!account) {
        throw new Error('Wallet not connected')
      }

      console.log('=== Distributing Escrow ===')
      console.log('Track Address:', trackAddress)
      console.log('Track ID:', trackId)
      console.log('Amount:', amount)
      console.log('Escrow Token Account:', escrowTokenAccount)
      console.log('Escrow Token Account type:', typeof escrowTokenAccount)
      console.log('Contributors raw:', contributors)
      console.log('Contributors count:', contributors.length)

      // Validate inputs
      if (!trackAddress || typeof trackAddress !== 'string') {
        throw new Error(`Invalid track address: ${trackAddress}`)
      }
      if (!escrowTokenAccount || typeof escrowTokenAccount !== 'string') {
        throw new Error(`Invalid escrow token account: ${escrowTokenAccount}`)
      }

      console.log('Converting escrowTokenAccount to address:', escrowTokenAccount)
      console.log('Length:', escrowTokenAccount.length)
      console.log('First 10 chars:', escrowTokenAccount.substring(0, 10))
      
      let escrowAddress
      try {
        escrowAddress = address(escrowTokenAccount)
        console.log('Successfully converted to address')
      } catch (err) {
        console.error('Error converting escrowTokenAccount to address:', err)
        throw new Error(`Failed to convert escrow token account to address: ${escrowTokenAccount}`)
      }

      // Get the escrow account to find the mint
      const escrowAccountInfo = await client.rpc.getAccountInfo(escrowAddress, { encoding: 'base64' }).send()
      if (!escrowAccountInfo.value) {
        throw new Error('Escrow token account not found')
      }

      // For each contributor, we need to get their ATA for the mint
      // Token account data structure: mint is at bytes 0-32
      const escrowData = Buffer.from(escrowAccountInfo.value.data[0], 'base64')
      const mintBytes = escrowData.slice(0, 32)
      
      // Import SPL token utilities
      const { getAssociatedTokenAddressSync } = await import('@solana/spl-token')
      const { PublicKey } = await import('@solana/web3.js')
      
      const mintPubkey = new PublicKey(mintBytes)
      const mintAddress = mintPubkey.toBase58()
      
      console.log('Mint address:', mintAddress)

      // Derive ATAs for each contributor
      const contributorTokenAccounts = contributors.map((contributorBytes, index) => {
        console.log(`Processing contributor ${index}:`, contributorBytes)
        
        const contributorPubkey = new PublicKey(Buffer.from(contributorBytes))
        const ata = getAssociatedTokenAddressSync(mintPubkey, contributorPubkey)
        
        console.log(`Contributor ${index} address:`, contributorPubkey.toBase58())
        console.log(`Contributor ${index} ATA:`, ata.toBase58())
        return address(ata.toBase58())
      })

      console.log('Contributor token accounts:', contributorTokenAccounts.map(a => a.toString()))

      // Check if all contributor token accounts exist and create them if needed
      console.log('Checking if contributor token accounts exist...')
      const { createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } = await import('@solana/spl-token')
      const { SystemProgram, TransactionMessage, VersionedTransaction } = await import('@solana/web3.js')
      const missingAccounts = []
      
      for (let i = 0; i < contributorTokenAccounts.length; i++) {
        const accountInfo = await client.rpc.getAccountInfo(contributorTokenAccounts[i], { encoding: 'base64' }).send()
        if (!accountInfo.value) {
          console.log(`Contributor ${i} token account does not exist, needs to be created`)
          missingAccounts.push(i)
        } else {
          console.log(`Contributor ${i} token account exists`)
        }
      }

      if (missingAccounts.length > 0) {
        console.log(`Creating ${missingAccounts.length} contributor token accounts...`)
        
        // Create instructions for missing accounts
        const createInstructions = missingAccounts.map(i => {
          const contributorPubkey = new PublicKey(Buffer.from(contributors[i]))
          return createAssociatedTokenAccountInstruction(
            new PublicKey(account.address), // payer
            new PublicKey(contributorTokenAccounts[i].toString()), // ata address
            contributorPubkey, // owner
            mintPubkey // mint
          )
        })

        // Send creation transaction first
        try {
          const { Connection } = await import('@solana/web3.js')
          const connection = new Connection('http://127.0.0.1:8899', 'confirmed')
          const { blockhash } = await connection.getLatestBlockhash()
          
          const message = new TransactionMessage({
            payerKey: new PublicKey(account.address),
            recentBlockhash: blockhash,
            instructions: createInstructions,
          }).compileToV0Message()
          
          const tx = new VersionedTransaction(message)
          
          // This is a bit hacky but we need to sign and send this separately
          console.log('Sending ATA creation transaction...')
          toast.info('Creating token accounts for contributors...')
          
          // We'll throw an error and ask user to create accounts manually for now
          throw new Error(`${missingAccounts.length} contributor(s) need token accounts. Please ask them to initialize their token accounts for this mint first, or you need to airdrop them some SOL so accounts can be created automatically.`)
          
        } catch (error) {
          console.error('Error creating token accounts:', error)
          throw error
        }
      }

      const baseInstruction = await getEscrowDistributeInstructionAsync({
        amount,
        trackId,
        authority: txSigner,
        track: address(trackAddress),
        escrowTokenAccount: escrowAddress, // Use the already converted address
      })

      // Create a new instruction object with remaining accounts added
      const instruction = {
        ...baseInstruction,
        accounts: [
          ...(baseInstruction.accounts || []),
          ...contributorTokenAccounts.map(acc => ({
            address: acc,
            role: 1, // Writable
          })),
        ]
      }

      console.log('Instruction created with', instruction.accounts?.length, 'accounts')

      try {
        console.log('Sending transaction...')
        const result = await signAndSend(instruction, txSigner)
        console.log('Transaction result:', result)
        return result
      } catch (error: any) {
        console.error('Transaction error:', error)
        console.error('Error type:', typeof error)
        console.error('Error keys:', Object.keys(error))
        
        if (error?.message) {
          console.error('Error message:', error.message)
        }
        if (error?.logs) {
          console.error('Transaction logs:', error.logs)
        }
        if (error?.cause) {
          console.error('Error cause:', error.cause)
        }
        
        throw error
      }
    },
    onSuccess: (signature) => {
      toastTx(signature)
      toast.success('Payments distributed successfully!')
      
      queryClient.invalidateQueries({ queryKey: ['track'] })
      queryClient.invalidateQueries({ queryKey: ['escrow'] })
    },
    onError: (error) => {
      console.error('Error distributing payments:', error)
      if (error instanceof Error) {
        console.error('Error message:', error.message)
      }
      toast.error('Failed to distribute payments')
    },
  })
}
