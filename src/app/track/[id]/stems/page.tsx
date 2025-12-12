'use client'

import { useParams } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { useSolana } from '@/components/solana/use-solana'
import { toast } from 'sonner'
import { uploadToPinata } from '@/lib/pinata'
import { useMintStemNftMutation } from '@/features/muzica/data-access/use-mint-stem-nft-mutation'
import { useTrackQuery } from '@/features/muzica/data-access/use-track-query'

export default function StemsPage() {
  const params = useParams()
  const id = params.id as string
  const { account } = useSolana()
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  
  const { data: track } = useTrackQuery({ trackAddress: id })
  const mintStemNft = useMintStemNftMutation()

  const uploadAndMintStem = async () => {
    if (!file) {
      toast.error('Please select a file')
      return
    }

    if (!name.trim()) {
      toast.error('Please enter a stem name')
      return
    }

    if (!account?.address) {
      toast.error('Please connect your wallet')
      return
    }

    if (!track) {
      toast.error('Track not found')
      return
    }

    setIsUploading(true)
    try {
      // Step 1: Upload to IPFS via Pinata
      toast.info('Uploading to IPFS...')
      const cid = await uploadToPinata(file)
      console.log('Uploaded to IPFS:', cid)
      
      // TODO: Store CID in NFT metadata using Metaplex
      // For now, we just mint the basic NFT without metadata
      
      // Step 2: Find the current wallet's contributor index
      // Convert wallet address to bytes for comparison
      const { getAddressEncoder } = await import('gill')
      const { address: addressFn } = await import('gill')
      const addressEncoder = getAddressEncoder()
      const walletBytes = addressEncoder.encode(addressFn(account.address))
      const walletBase64 = Buffer.from(walletBytes).toString('base64')
      
      console.log('Current wallet base64:', walletBase64)
      console.log('Contributors:', track.data.contributors)
      
      // Find index in contributors array
      const contributorIndex = track.data.contributors.findIndex((contributor: number[]) => {
        const contributorBase64 = Buffer.from(contributor).toString('base64')
        return contributorBase64 === walletBase64
      })
      
      if (contributorIndex === -1) {
        toast.error('You are not a contributor to this track')
        return
      }
      
      console.log('Contributor index:', contributorIndex)
      
      // Step 3: Mint the stem NFT on-chain
      toast.info('Minting stem NFT...')
      
      await mintStemNft.mutateAsync({
        trackAddress: id,
        trackId: track.data.trackId,
        nftIndex: contributorIndex,
      })
      
      toast.success('Stem uploaded and NFT minted!')
      
      // Reset form
      setFile(null)
      setName('')
    } catch (error) {
      console.error('Error uploading stem:', error)
      toast.error('Failed to upload stem')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Link href={`/track/${id}`}>
        <button className="mb-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-medium transition flex items-center gap-2">
          <span>←</span> Back to Track
        </button>
      </Link>
      <h1 className="text-2xl font-bold mb-6">Manage Stems - Track #{id}</h1>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Stem Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border rounded p-2 w-full"
            placeholder="e.g., Drums, Bass, Vocals"
            disabled={isUploading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Upload Stem (Audio File)</label>
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="border rounded p-2 w-full"
            disabled={isUploading}
          />
          {file && (
            <p className="text-sm text-muted-foreground mt-1">
              Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>

        <div className="pt-4">
          <button
            onClick={uploadAndMintStem}
            disabled={isUploading || !account?.address || mintStemNft.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isUploading || mintStemNft.isPending ? 'Processing...' : 'Upload & Mint Stem NFT'}
          </button>
        </div>
      </div>

      {track && track.data.stemMints && track.data.stemMints.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Existing Stems ({track.data.stemMints.length})</h2>
          <div className="space-y-3">
            {track.data.stemMints.map((stemMint: any, idx: number) => {
              const stemMintAddress = Buffer.from(stemMint).toString('base64').substring(0, 20) + '...'
              return (
                <div key={idx} className="border rounded p-4 bg-gray-50">
                  <div className="font-semibold">Stem #{idx + 1}</div>
                  <div className="text-sm text-gray-600 font-mono mt-1">{stemMintAddress}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded">
        <h3 className="font-semibold text-blue-800 mb-2">ℹ️ How it works</h3>
        <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
          <li>Upload your audio stem file (uploaded to IPFS via Pinata for storage)</li>
          <li>The system mints a unique NFT for this stem on the blockchain</li>
          <li>Each contributor can mint one stem NFT based on their contributor index</li>
          <li>The NFT mint address is added to the track's stem_mints array</li>
          <li>Note: CID metadata storage with Metaplex coming soon!</li>
        </ol>
      </div>
    </div>
  )
}
