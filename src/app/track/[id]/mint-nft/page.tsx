'use client'

import { useParams } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { useSolana } from '@/components/solana/use-solana'
import { toast } from 'sonner'
import { useTrackQuery } from '@/features/muzica/data-access/use-track-query'
import { useMintStemNftMutation } from '@/features/muzica/data-access/use-mint-stem-nft-mutation'
import { useMintedNftsQuery } from '@/features/muzica/data-access/use-minted-nfts-query'

export default function MintNftPage() {
  const params = useParams()
  const id = params.id as string
  const { account } = useSolana()
  
  const { data: track, isLoading } = useTrackQuery({ trackAddress: id })
  const mintNftMutation = useMintStemNftMutation()
  const { data: mintedNfts, refetch: refetchNfts } = useMintedNftsQuery({ 
    trackAddress: id, 
    contributorCount: track?.data?.contributors?.length || 0 
  })
  
  const [nftIndex, setNftIndex] = useState(0)

  const mintNft = async () => {
    if (!account?.address) {
      toast.error('Please connect your wallet')
      return
    }

    if (!track?.data) {
      toast.error('Track not loaded')
      return
    }

    try {
      await mintNftMutation.mutateAsync({
        trackAddress: id,
        trackId: track.data.trackId,
        nftIndex,
      })
      
      // Refetch minted NFTs after successful mint
      setTimeout(() => {
        refetchNfts()
      }, 1000)
    } catch (error) {
      console.error('Error minting NFT:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-center">Loading track data...</div>
      </div>
    )
  }

  if (!track?.data) {
    return (
      <div className="p-8">
        <div className="text-center text-red-600">Track not found</div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Link href={`/track/${id}`}>
        <button className="mb-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-medium transition flex items-center gap-2">
          <span>←</span> Back to Track
        </button>
      </Link>
      <h1 className="text-2xl font-bold mb-6">Mint Stem NFT - Track #{track.data.trackId.toString()}</h1>

      <div className="border rounded p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Mint NFT to Contributor</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Mint a unique Stem NFT to yourself if you are a contributor. The NFT index must match your position in the contributors list.
        </p>

        <div className="space-y-4">
          <div className="bg-gray-50 rounded p-4">
            <h3 className="text-sm font-semibold mb-3 text-gray-900">Contributors List</h3>
            <div className="space-y-2">
              {track.data.contributors.map((contributorBytes, index) => {
                const { PublicKey } = require('@solana/web3.js')
                const contributorPubkey = new PublicKey(Buffer.from(contributorBytes))
                const contributorAddress = contributorPubkey.toBase58()
                const isYou = contributorAddress === account?.address
                const isMinted = mintedNfts?.some(nft => nft.index === index)
                
                return (
                  <div key={index} className={`flex justify-between items-center text-sm p-3 rounded-lg ${isYou ? 'bg-[#5A9CB5]/20 border-2 border-[#5A9CB5]' : isMinted ? 'bg-[#FACE68]/20 border border-[#FACE68]' : 'bg-white border border-gray-200'}`}>
                    <span className="text-gray-900 font-medium">
                      Index {index}: 
                      <code className="ml-2 text-xs bg-white px-2 py-1 rounded">{contributorAddress.slice(0, 8)}...</code>
                    </span>
                    <div className="flex items-center gap-2">
                      {isMinted && <span className="text-[#FAAC68] text-xs font-bold bg-[#FACE68]/30 px-2 py-1 rounded-full">✓ Minted</span>}
                      {isYou && <span className="text-[#5A9CB5] font-bold bg-[#5A9CB5]/20 px-3 py-1 rounded-full">← You</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900">Your Contributor Index</label>
            <input
              type="number"
              value={nftIndex}
              onChange={(e) => setNftIndex(Number(e.target.value))}
              className="border rounded p-2 w-full text-black bg-white"
              placeholder="0"
              min="0"
              max={track.data.contributors.length - 1}
              disabled={mintNftMutation.isPending}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter your index from the contributors list above (must match your wallet address)
            </p>
          </div>

          <button
            onClick={mintNft}
            disabled={mintNftMutation.isPending || !account?.address}
            className="w-full px-6 py-3 bg-[#5A9CB5] text-white rounded-lg hover:bg-[#4A8CA5] disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold transition shadow-md"
          >
            {mintNftMutation.isPending ? 'Minting...' : 'Mint Your Stem NFT'}
          </button>
        </div>
      </div>

      <div className="bg-[#5A9CB5]/10 border border-[#5A9CB5]/30 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">ℹ️ About Stem NFTs</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• Each contributor can receive a unique Stem NFT (one per contributor)</li>
          <li>• You must be in the contributors list to mint an NFT</li>
          <li>• The NFT index must match your position in the contributors array</li>
          <li>• NFTs are minted from a PDA-derived mint account</li>
          <li>• The mint authority is the track PDA</li>
          <li>• Each NFT represents ownership/contribution to a specific stem</li>
        </ul>
      </div>

      {/* Minted NFTs Section */}
      {mintedNfts && mintedNfts.length > 0 && (
        <div className="mt-6 border rounded p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900">Minted NFTs ({mintedNfts.length})</h2>
          <div className="space-y-3">
            {mintedNfts.map((nft) => {
              const contributorBytes = track.data.contributors[nft.index]
              const { PublicKey } = require('@solana/web3.js')
              const contributorPubkey = new PublicKey(Buffer.from(contributorBytes))
              const contributorAddress = contributorPubkey.toBase58()
              
              return (
                <div key={nft.index} className="bg-[#FACE68]/10 border-2 border-[#FACE68] rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-sm font-semibold text-gray-900">NFT #{nft.index}</span>
                      <p className="text-xs text-gray-600 mt-1">
                        Contributor: <code className="bg-white px-2 py-1 rounded">{contributorAddress.slice(0, 8)}...{contributorAddress.slice(-8)}</code>
                      </p>
                    </div>
                    <span className="text-xs bg-[#FACE68] text-black font-bold px-3 py-1 rounded-full">Minted</span>
                  </div>
                  <div className="text-xs text-gray-700">
                    <span className="font-medium">Mint Address:</span>
                    <code className="ml-2 bg-white px-2 py-1 rounded break-all">{nft.mintAddress}</code>
                  </div>
                  <div className="text-xs text-gray-700 mt-1">
                    <span className="font-medium">Supply:</span> {nft.supply}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
