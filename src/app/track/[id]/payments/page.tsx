'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSolana } from '@/components/solana/use-solana'
import { toast } from 'sonner'
import { useTrackQuery } from '@/features/muzica/data-access/use-track-query'
import { useEscrowDepositMutation } from '@/features/muzica/data-access/use-escrow-deposit-mutation'
import { useEscrowDistributeMutation } from '@/features/muzica/data-access/use-escrow-distribute-mutation'
import { useCreateEscrowAtaMutation } from '@/features/muzica/data-access/use-create-escrow-ata-mutation'
import { useInitializeContributorAccountsMutation } from '@/features/muzica/data-access/use-initialize-contributor-accounts-mutation'
import { useWalletUiGill } from '@wallet-ui/react-gill'
import { address, getAddressDecoder } from 'gill'

export default function PaymentsPage() {
  const params = useParams()
  const id = params.id as string
  const { account } = useSolana()
  const client = useWalletUiGill()
  
  const { data: track, isLoading } = useTrackQuery({ trackAddress: id })
  const depositMutation = useEscrowDepositMutation()
  const distributeMutation = useEscrowDistributeMutation()
  const createEscrowAtaMutation = useCreateEscrowAtaMutation()
  const initializeContributorAccountsMutation = useInitializeContributorAccountsMutation()
  
  const [depositAmount, setDepositAmount] = useState('')
  const [distributeAmount, setDistributeAmount] = useState('')
  const [escrowBalance, setEscrowBalance] = useState('0')
  const [escrowTokenAccount, setEscrowTokenAccount] = useState<string>('')
  const [mint, setMint] = useState<string>('')
  const [showMintInput, setShowMintInput] = useState(true)
  const [escrowAccountExists, setEscrowAccountExists] = useState(false)
  const [refetchTrigger, setRefetchTrigger] = useState(0)
  const [contributorBalances, setContributorBalances] = useState<{ address: string; balance: string }[]>([])
  const [paymentHistory, setPaymentHistory] = useState<any[]>([])

  // Load mint from localStorage on mount
  useEffect(() => {
    const savedMint = localStorage.getItem(`mint-${id}`)
    if (savedMint) {
      setMint(savedMint)
      setShowMintInput(false)
    }
  }, [id])

  // Save mint to localStorage when it changes
  useEffect(() => {
    if (mint) {
      localStorage.setItem(`mint-${id}`, mint)
    }
  }, [mint, id])

  // Fetch escrow token account and balance
  useEffect(() => {
    async function fetchEscrowData() {
      if (!track?.data || !client || !mint) return

      try {
        // Derive escrow ATA
        const { getAssociatedTokenAddressSync } = await import('@solana/spl-token')
        const { PublicKey } = await import('@solana/web3.js')
        
        const trackPubkey = new PublicKey(id)
        const mintPubkey = new PublicKey(mint)
        const escrowAta = getAssociatedTokenAddressSync(mintPubkey, trackPubkey, true)
        
        setEscrowTokenAccount(escrowAta.toBase58())
        
        // Fetch balance
        const accountInfo = await client.rpc.getAccountInfo(address(escrowAta.toBase58()), { encoding: 'base64' }).send()
        if (accountInfo.value) {
          setEscrowAccountExists(true)
          // Token account amount is at bytes 64-72 (u64 little endian)
          const data = Buffer.from(accountInfo.value.data[0], 'base64')
          
          // Read u64 little endian manually
          let amount = BigInt(0)
          for (let i = 0; i < 8; i++) {
            amount += BigInt(data[64 + i]) << BigInt(i * 8)
          }
          
          const decimals = 6 // USDC has 6 decimals
          const balance = (Number(amount) / Math.pow(10, decimals)).toFixed(2)
          setEscrowBalance(balance)
        } else {
          setEscrowAccountExists(false)
          setEscrowBalance('0.00')
        }
      } catch (error) {
        console.error('Error fetching escrow data:', error)
        setEscrowAccountExists(false)
      }
    }

    fetchEscrowData()
  }, [track, id, mint, client, refetchTrigger])

  // Fetch contributor balances
  useEffect(() => {
    async function fetchContributorBalances() {
      if (!track?.data || !client || !mint) return

      try {
        const { getAssociatedTokenAddressSync } = await import('@solana/spl-token')
        const { PublicKey } = await import('@solana/web3.js')
        
        const mintPubkey = new PublicKey(mint)
        const balances = []

        for (const contributorBytes of track.data.contributors) {
          const contributorPubkey = new PublicKey(Buffer.from(contributorBytes))
          const ata = getAssociatedTokenAddressSync(mintPubkey, contributorPubkey)
          
          const accountInfo = await client.rpc.getAccountInfo(address(ata.toBase58()), { encoding: 'base64' }).send()
          
          if (accountInfo.value) {
            const data = Buffer.from(accountInfo.value.data[0], 'base64')
            
            // Read u64 little endian manually
            let amount = BigInt(0)
            for (let i = 0; i < 8; i++) {
              amount += BigInt(data[64 + i]) << BigInt(i * 8)
            }
            
            const decimals = 6 // USDC has 6 decimals
            const balance = (Number(amount) / Math.pow(10, decimals)).toFixed(2)
            
            balances.push({
              address: contributorPubkey.toBase58(),
              balance,
            })
          } else {
            balances.push({
              address: contributorPubkey.toBase58(),
              balance: 'N/A',
            })
          }
        }
        
        setContributorBalances(balances)
      } catch (error) {
        console.error('Error fetching contributor balances:', error)
      }
    }

    fetchContributorBalances()
  }, [track, mint, client, refetchTrigger])

  // Fetch payment history
  useEffect(() => {
    async function fetchPaymentHistory() {
      if (!escrowTokenAccount || !client) return

      try {
        const { PublicKey } = await import('@solana/web3.js')
        const escrowPubkey = new PublicKey(escrowTokenAccount)
        
        // Get transaction signatures for this account
        const signatures = await client.rpc.getSignaturesForAddress(address(escrowTokenAccount), { limit: 20 }).send()
        
        const transactions = []
        for (const sig of signatures) {
          try {
            const tx = await client.rpc.getTransaction(sig.signature, { 
              encoding: 'jsonParsed',
              maxSupportedTransactionVersion: 0 
            }).send()
            
            if (tx) {
              transactions.push({
                signature: sig.signature,
                slot: sig.slot,
                blockTime: sig.blockTime,
                err: sig.err,
                transaction: tx,
              })
            }
          } catch (err) {
            console.error('Error fetching transaction:', err)
          }
        }
        
        setPaymentHistory(transactions)
      } catch (error) {
        console.error('Error fetching payment history:', error)
      }
    }

    fetchPaymentHistory()
  }, [escrowTokenAccount, client, refetchTrigger])

  // Function to refetch balance
  const refetchBalance = () => {
    setRefetchTrigger(prev => prev + 1)
  }

  const createEscrowAccount = async () => {
    if (!account?.address) {
      toast.error('Please connect your wallet')
      return
    }

    if (!track?.data) {
      toast.error('Track not loaded')
      return
    }

    if (!mint) {
      toast.error('Please configure mint address first')
      return
    }

    if (!escrowTokenAccount) {
      toast.error('Escrow account address not derived')
      return
    }

    // Check if account already exists
    if (escrowAccountExists) {
      toast.info('Escrow account already exists')
      return
    }

    try {
      // Get authority address
      const authorityBytes = Buffer.from(track.data.authority, 'base64')
      const authorityAddress = getAddressDecoder().decode(new Uint8Array(authorityBytes))
      
      console.log('Creating escrow ATA with params:')
      console.log('- Track:', id)
      console.log('- Track ID:', track.data.trackId)
      console.log('- Authority:', authorityAddress)
      console.log('- Escrow Account:', escrowTokenAccount)
      console.log('- Mint:', mint)
      
      await createEscrowAtaMutation.mutateAsync({
        trackAddress: id,
        trackId: track.data.trackId,
        authorityAddress,
        escrowTokenAccount,
        mint,
      })
      
      // Refresh escrow data
      refetchBalance()
    } catch (error) {
      console.error('Error creating escrow account:', error)
    }
  }

  const depositToEscrow = async () => {
    if (!depositAmount || Number(depositAmount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    if (!account?.address) {
      toast.error('Please connect your wallet')
      return
    }

    if (!track?.data) {
      toast.error('Track not loaded')
      return
    }

    if (!escrowTokenAccount) {
      toast.error('Escrow account not found')
      return
    }

    try {
      const { getAssociatedTokenAddressSync } = await import('@solana/spl-token')
      const { PublicKey } = await import('@solana/web3.js')
      
      const payerPubkey = new PublicKey(account.address)
      const mintPubkey = new PublicKey(mint)
      const payerAta = getAssociatedTokenAddressSync(mintPubkey, payerPubkey)
      
      // Convert amount to lamports (6 decimals for USDC)
      const amount = BigInt(Math.floor(Number(depositAmount) * 1_000_000))
      
      // Get authority address
      const authorityBytes = Buffer.from(track.data.authority, 'base64')
      const authorityAddress = getAddressDecoder().decode(new Uint8Array(authorityBytes))
      
      await depositMutation.mutateAsync({
        trackAddress: id,
        trackId: track.data.trackId,
        amount,
        authorityAddress,
        escrowTokenAccount,
        payerTokenAccount: payerAta.toBase58(),
        mint,
      })
      
      setDepositAmount('')
      
      // Wait a bit for blockchain to update, then refetch
      setTimeout(() => {
        refetchBalance()
      }, 1000)
    } catch (error) {
      console.error('Error depositing:', error)
    }
  }

  const distributePayments = async () => {
    if (!distributeAmount || Number(distributeAmount) <= 0) {
      toast.error('Please enter a valid distribution amount')
      return
    }

    if (!account?.address) {
      toast.error('Please connect your wallet')
      return
    }

    if (!track?.data) {
      toast.error('Track not loaded')
      return
    }

    if (!escrowTokenAccount) {
      toast.error('Escrow account not found')
      return
    }

    console.log('=== Before Distribution ===')
    console.log('Track Address:', id, 'Type:', typeof id)
    console.log('Track ID:', track.data.trackId, 'Type:', typeof track.data.trackId)
    console.log('Amount:', distributeAmount)
    console.log('Escrow Token Account:', escrowTokenAccount, 'Type:', typeof escrowTokenAccount)
    console.log('Contributors:', track.data.contributors)

    try {
      // Convert amount to lamports (6 decimals for USDC)
      const amount = BigInt(Math.floor(Number(distributeAmount) * 1_000_000))
      
      console.log('Amount in lamports:', amount)
      
      await distributeMutation.mutateAsync({
        trackAddress: id,
        trackId: track.data.trackId,
        amount,
        escrowTokenAccount,
        contributors: track.data.contributors,
      })
      
      setDistributeAmount('')
      
      // Wait a bit for blockchain to update, then refetch
      setTimeout(() => {
        refetchBalance()
      }, 1000)
    } catch (error) {
      console.error('Error distributing:', error)
    }
  }

  const initializeContributorAccounts = async () => {
    if (!track?.data) {
      toast.error('Track not loaded')
      return
    }

    if (!mint) {
      toast.error('Please configure mint address first')
      return
    }

    try {
      await initializeContributorAccountsMutation.mutateAsync({
        contributors: track.data.contributors,
        mint,
      })
    } catch (error) {
      console.error('Error initializing contributor accounts:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">Loading track...</div>
      </div>
    )
  }

  if (!track) {
    return (
      <div className="p-8">
        <div className="text-red-500">Track not found</div>
      </div>
    )
  }

  const isDepositing = depositMutation.isPending
  const isDistributing = distributeMutation.isPending

  const trackTitle = track?.data?.title 
    ? new TextDecoder().decode(new Uint8Array(Buffer.from(track.data.title, 'base64')))
    : 'Unknown Track'

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link href={`/track/${id}`}>
        <button className="mb-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-medium transition flex items-center gap-2">
          <span>←</span> Back to Track
        </button>
      </Link>
      <h1 className="text-2xl font-bold mb-2">Payments & Escrow</h1>
      <p className="text-muted-foreground mb-6">{trackTitle}</p>

      {/* Mint Address Configuration */}
      {showMintInput && (
        <div className="border rounded-lg p-6 mb-6 bg-yellow-50 border-yellow-200">
          <h2 className="text-lg font-semibold mb-3 text-gray-900">⚙️ Configure USDC Mint</h2>
          <p className="text-sm text-gray-700 mb-4">
            Enter your USDC mint address. If you haven't created one yet,{' '}
            <a href="/setup-usdc" className="text-blue-600 hover:underline">
              go to Setup USDC page
            </a>
            .
          </p>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900">
                USDC Mint Address
              </label>
              <input
                type="text"
                value={mint}
                onChange={(e) => setMint(e.target.value)}
                className="border rounded p-2 w-full font-mono text-sm text-gray-900 bg-white"
                placeholder="7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
              />
            </div>
            
            <button
              onClick={() => {
                if (!mint) {
                  toast.error('Please enter a mint address')
                  return
                }
                setShowMintInput(false)
                toast.success('Mint address configured!')
              }}
              disabled={!mint}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {!showMintInput && (
        <>
          <div className="mb-6 p-4 bg-gray-50 border rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-700">USDC Mint:</p>
                <code className="text-xs text-gray-900">{mint.slice(0, 20)}...{mint.slice(-8)}</code>
              </div>
              <button
                onClick={() => setShowMintInput(true)}
                className="text-sm text-blue-600 hover:underline"
              >
                Change
              </button>
            </div>
          </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Deposit Section */}
        <div className="border rounded p-6">
          <h2 className="text-xl font-semibold mb-4">Deposit to Escrow</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Deposit tokens into the track escrow account for later distribution to contributors.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4 text-sm text-gray-900">
            <p className="font-medium mb-1 text-gray-900">
              {escrowAccountExists ? '✅ Escrow Account Ready' : '⚠️ Setup Required'}
            </p>
            {!escrowAccountExists && (
              <>
                <p className="text-xs text-gray-800 mb-2">
                  The escrow token account needs to be created before you can deposit tokens.
                </p>
                <button
                  onClick={createEscrowAccount}
                  disabled={createEscrowAtaMutation.isPending}
                  className="w-full mt-2 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {createEscrowAtaMutation.isPending ? 'Creating...' : 'Create Escrow Account'}
                </button>
              </>
            )}
            {escrowAccountExists && escrowTokenAccount && (
              <div className="mt-2 pt-2 border-t border-blue-200">
                <p className="text-xs text-gray-800">
                  <span className="font-medium">Escrow Account:</span>{' '}
                  <code className="bg-blue-100 px-1 rounded text-gray-900">{escrowTokenAccount.slice(0, 8)}...</code>
                </p>
              </div>
            )}
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900">Amount (USDC)</label>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="border rounded p-2 w-full text-gray-900 bg-white"
                placeholder="0.00"
                min="0"
                step="0.01"
                disabled={isDepositing}
              />
            </div>

            <button
              onClick={depositToEscrow}
              disabled={isDepositing || !account?.address || !escrowAccountExists}
              className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isDepositing ? 'Depositing...' : 'Deposit'}
            </button>
          </div>
        </div>

        {/* Distribute Section */}
        <div className="border rounded p-6">
          <h2 className="text-xl font-semibold mb-4">Distribute Payments</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Distribute escrowed funds to all contributors according to their revenue split percentages.
          </p>

          <div className="bg-gray-50 rounded p-4 mb-4">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-700">Escrow Balance:</span>
              <span className="font-semibold text-gray-900">{escrowBalance} USDC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-700">Contributors:</span>
              <span className="font-semibold text-gray-900">{track.data.contributors.length}</span>
            </div>
          </div>

          {/* Contributor Balances */}
          {contributorBalances.length > 0 && (
            <div className="bg-blue-50 rounded p-4 mb-4">
              <h3 className="text-sm font-semibold mb-3 text-gray-900">Contributor Token Balances</h3>
              <div className="space-y-2">
                {contributorBalances.map((contributor, index) => (
                  <div key={contributor.address} className="flex justify-between items-center text-sm">
                    <span className="text-gray-700">
                      Contributor {index + 1}: 
                      <code className="ml-2 text-xs bg-white px-2 py-1 rounded">{contributor.address.slice(0, 8)}...</code>
                    </span>
                    <span className="font-semibold text-gray-900">
                      {contributor.balance === 'N/A' ? 'No Account' : `${contributor.balance} USDC`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900">Amount to Distribute (USDC)</label>
              <input
                type="number"
                value={distributeAmount}
                onChange={(e) => setDistributeAmount(e.target.value)}
                className="border rounded p-2 w-full text-gray-900 bg-white"
                placeholder="0.00"
                min="0"
                step="0.01"
                disabled={isDistributing}
              />
            </div>

            <button
              onClick={initializeContributorAccounts}
              disabled={initializeContributorAccountsMutation.isPending || !account?.address || !mint}
              className="w-full px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed mb-2"
            >
              {initializeContributorAccountsMutation.isPending ? 'Initializing...' : 'Initialize Contributor Accounts'}
            </button>
            <p className="text-xs text-gray-600 mb-3">
              Click this button first if contributors don't have token accounts yet. This creates their accounts so they can receive payments.
            </p>

            <button
              onClick={distributePayments}
              disabled={isDistributing || !account?.address}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isDistributing ? 'Distributing...' : 'Distribute to Contributors'}
            </button>
          </div>
        </div>
      </div>

      {/* Payment History */}
      <div className="mt-8 border rounded p-6">
        <h2 className="text-xl font-semibold mb-4">Payment History</h2>
        {!escrowTokenAccount ? (
          <div className="text-sm text-muted-foreground">
            Create escrow account first to view payment history.
          </div>
        ) : paymentHistory.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No transactions yet. Deposit or distribute funds to see history.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-700">Date</th>
                  <th className="px-4 py-2 text-left text-gray-700">Signature</th>
                  <th className="px-4 py-2 text-left text-gray-700">Status</th>
                  <th className="px-4 py-2 text-right text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paymentHistory.map((payment) => (
                  <tr key={payment.signature} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-red-900">
                      {payment.blockTime 
                        ? new Date(Number(payment.blockTime) * 1000).toLocaleString()
                        : 'Pending'}
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-900">
                        {payment.signature.slice(0, 8)}...{payment.signature.slice(-8)}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        payment.err 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {payment.err ? 'Failed' : 'Success'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={`https://explorer.solana.com/tx/${payment.signature}?cluster=custom&customUrl=http://127.0.0.1:8899`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-xs"
                      >
                        View Details →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      )}
    </div>
  )
}
