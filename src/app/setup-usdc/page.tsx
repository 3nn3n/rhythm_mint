'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSolana } from '@/components/solana/use-solana'
import { toast } from 'sonner'

export default function SetupUSDCPage() {
  const { account } = useSolana()
  const [isCreating, setIsCreating] = useState(false)
  const [isMinting, setIsMinting] = useState(false)
  const [mintAddress, setMintAddress] = useState<string>('')
  const [tokenAccount, setTokenAccount] = useState<string>('')
  const [mintAmount, setMintAmount] = useState<string>('10000')

  const createUSDCMint = async () => {
    if (!account?.address) {
      toast.error('Please connect your wallet')
      return
    }

    setIsCreating(true)
    try {
      const { PublicKey, Keypair, SystemProgram, Transaction, Connection } = await import('@solana/web3.js')
      const { 
        TOKEN_PROGRAM_ID,
        createInitializeMint2Instruction,
        getMintLen,
        MINT_SIZE
      } = await import('@solana/spl-token')
      
      // Create connection to localnet
      const connection = new Connection('http://127.0.0.1:8899', 'confirmed')
      
      // Generate a new keypair for the mint
      const mintKeypair = Keypair.generate()
      
      console.log('Creating mint:', mintKeypair.publicKey.toBase58())
      
      const walletPubkey = new PublicKey(account.address)
      
      // Calculate rent
      const lamports = await connection.getMinimumBalanceForRentExemption(MINT_SIZE)
      
      // Build transaction
      const transaction = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: walletPubkey,
          newAccountPubkey: mintKeypair.publicKey,
          space: MINT_SIZE,
          lamports,
          programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMint2Instruction(
          mintKeypair.publicKey,
          6, // decimals
          walletPubkey, // mint authority
          null, // freeze authority (none)
          TOKEN_PROGRAM_ID
        )
      )
      
      // Get latest blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = walletPubkey
      
      // Sign with mint keypair
      transaction.partialSign(mintKeypair)
      
      // Request wallet to sign and send
      const signed = await (window as any).solana.signAndSendTransaction(transaction)
      
      console.log('Transaction signature:', signed.signature)
      
      // Wait for confirmation
      await connection.confirmTransaction({
        signature: signed.signature,
        blockhash,
        lastValidBlockHeight,
      })
      
      setMintAddress(mintKeypair.publicKey.toBase58())
      toast.success('USDC mint created!')
      
      // Automatically create token account and mint initial supply
      await mintInitialSupply(mintKeypair.publicKey.toBase58())
      
    } catch (error: any) {
      console.error('Error creating mint:', error)
      toast.error(error.message || 'Failed to create mint')
    } finally {
      setIsCreating(false)
    }
  }

  const mintInitialSupply = async (mint?: string) => {
    const mintToUse = mint || mintAddress
    if (!mintToUse) {
      toast.error('No mint address')
      return
    }

    if (!account?.address) {
      toast.error('Please connect your wallet')
      return
    }

    setIsMinting(true)
    try {
      const { PublicKey, Transaction, Connection } = await import('@solana/web3.js')
      const { 
        getAssociatedTokenAddressSync,
        createAssociatedTokenAccountInstruction,
        createMintToInstruction,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      } = await import('@solana/spl-token')
      
      // Create connection to localnet
      const connection = new Connection('http://127.0.0.1:8899', 'confirmed')
      
      const mintPubkey = new PublicKey(mintToUse)
      const walletPubkey = new PublicKey(account.address)
      
      // Get ATA address
      const ata = getAssociatedTokenAddressSync(
        mintPubkey,
        walletPubkey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
      
      setTokenAccount(ata.toBase58())
      
      // Check if ATA exists
      const accountInfo = await connection.getAccountInfo(ata)
      
      const transaction = new Transaction()
      
      // Create ATA if it doesn't exist
      if (!accountInfo) {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            walletPubkey, // payer
            ata, // ata
            walletPubkey, // owner
            mintPubkey, // mint
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          )
        )
      }
      
      // Mint tokens
      const amount = BigInt(Math.floor(parseFloat(mintAmount) * 1_000_000))
      transaction.add(
        createMintToInstruction(
          mintPubkey, // mint
          ata, // destination
          walletPubkey, // authority
          amount, // amount
          [],
          TOKEN_PROGRAM_ID
        )
      )
      
      // Get latest blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = walletPubkey
      
      // Request wallet to sign and send
      const signed = await (window as any).solana.signAndSendTransaction(transaction)
      
      console.log('Transaction signature:', signed.signature)
      
      // Wait for confirmation
      await connection.confirmTransaction({
        signature: signed.signature,
        blockhash,
        lastValidBlockHeight,
      })
      
      toast.success(`Minted ${mintAmount} USDC!`)
      
    } catch (error: any) {
      console.error('Error minting:', error)
      toast.error(error.message || 'Failed to mint tokens')
    } finally {
      setIsMinting(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Setup Local USDC</h1>
        
        {mintAddress && (
          <Link href="/dashboard">
            <button className="px-6 py-3 bg-gradient-to-r from-[#5A9CB5] to-[#53629E] text-white rounded-lg font-semibold hover:scale-105 transition-transform shadow-lg">
              Go to Payments →
            </button>
          </Link>
        )}
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-900">
          Create a local USDC mint for testing on localnet.
          Mint unlimited test tokens to use with the escrow system.
        </p>
      </div>

      {/* Create Mint Section */}
      <div className="border rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">1. Create USDC Mint</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Create a new SPL token mint with 6 decimals (like real USDC)
        </p>
        
        {!mintAddress ? (
          <button
            onClick={createUSDCMint}
            disabled={isCreating || !account?.address}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isCreating ? 'Creating Mint...' : 'Create USDC Mint'}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 rounded p-3">
              <p className="text-sm font-medium text-green-800 mb-2">Mint Created!</p>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-white px-2 py-1 text-black rounded flex-1 overflow-x-auto">
                  {mintAddress}
                </code>
                <button
                  onClick={() => copyToClipboard(mintAddress)}
                  className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Copy
                </button>
              </div>
            </div>

            {tokenAccount && (
              <div className="bg-gray-50 border border-gray-200 rounded p-3">
                <p className="text-sm text-green-900 font-medium mb-2">Token Account:</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-white px-2 py-1 text-black rounded flex-1 overflow-x-auto">
                    {tokenAccount}
                  </code>
                  <button
                    onClick={() => copyToClipboard(tokenAccount)}
                    className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mint Tokens Section */}
      {mintAddress && (
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">2. Mint USDC Tokens</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Mint test USDC tokens to your wallet (you can do this unlimited times)
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Amount (USDC)
              </label>
              <input
                type="number"
                value={mintAmount}
                onChange={(e) => setMintAmount(e.target.value)}
                className="border rounded-lg p-2 w-full"
                placeholder="10000"
                min="1"
              />
            </div>

            <button
              onClick={() => mintInitialSupply()}
              disabled={isMinting || !account?.address}
              className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isMinting ? 'Minting...' : `Mint ${mintAmount} USDC`}
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 border rounded-lg p-6 bg-yellow-50 border-yellow-200">
        <h3 className="font-semibold mb-2 text-red-900">Next Steps:</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-red-900">
          <li>Copy the mint address above</li>
          <li>Go to the payments page after selecting the track</li>
          <li>Update the mint address in the UI</li>
          <li>Create the escrow token account for the track</li>
          <li>Start depositing and distributing USDC!</li>
        </ol>
      </div>
    </div>
  )
}
