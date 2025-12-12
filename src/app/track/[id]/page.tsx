'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { AudioPlayer } from '@/components/audio-player'
import { useTrackQuery } from '@/features/muzica/data-access/use-track-query'
import { useMintedNftsQuery } from '@/features/muzica/data-access/use-minted-nfts-query'

export default function TrackOverview() {
  const params = useParams()
  const id = params.id as string
  const { data: track, isLoading } = useTrackQuery({ trackAddress: id })
  const { data: mintedNfts } = useMintedNftsQuery({ 
    trackAddress: id, 
    contributorCount: track?.data?.contributors?.length || 0 
  })

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

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{track.data.title}</h1>
        <div className="flex gap-2">
          <Link href={`/track/${id}/stems`}>
            <button className="px-4 py-2 bg-[#5A9CB5] text-white rounded-lg hover:bg-[#4A8CA5] font-medium transition">Stems</button>
          </Link>
          <Link href={`/track/${id}/splits`}>
            <button className="px-4 py-2 bg-[#FACE68] text-black rounded-lg hover:bg-[#FAAC68] font-medium transition">Splits</button>
          </Link>
          <Link href={`/track/${id}/payments`}>
            <button className="px-4 py-2 bg-[#FAAC68] text-black rounded-lg hover:bg-[#FA6868] font-medium transition">Payments</button>
          </Link>
          <Link href={`/track/${id}/mint-nft`}>
            <button className="px-4 py-2 bg-white border-2 border-[#5A9CB5] text-black rounded-lg hover:bg-gray-50 font-medium transition">Mint NFT</button>
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-4">Audio Player</h2>
        {track.data.cid && track.data.cid.length > 5 ? (
          <div>
            <AudioPlayer src={`https://ipfs.io/ipfs/${track.data.cid}`} title={track.data.title} />
            <p className="text-sm text-gray-500 mt-2">
              IPFS CID: {track.data.cid} 
              <br />
              <a 
                href={`https://ipfs.io/ipfs/${track.data.cid}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#5A9CB5] hover:text-[#4A8CA5] font-semibold underline"
              >
                Open in new tab
              </a>
            </p>
          </div>
        ) : (
          <div className="border rounded p-4 text-gray-500">
            No audio file uploaded yet. Please upload your track to IPFS and update the CID.
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Track Info</h2>
        <div className="border rounded p-4 space-y-2">
          <div>
            <span className="font-semibold">Track ID:</span> {track.data.trackId?.toString()}
          </div>
          <div>
            <span className="font-semibold">IPFS CID:</span> {track.data.cid}
          </div>
          <div>
            <span className="font-semibold">Contributors:</span> {track.data.contributors.length}
          </div>
          <div>
            <span className="font-semibold">Stems:</span> {track.data.stemMints?.length || 0}
          </div>
        </div>
      </div>

      {track.data.stemMints && track.data.stemMints.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Stems ({track.data.stemMints.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {track.data.stemMints.map((stemMint: any, idx: number) => {
              const stemMintAddress = Buffer.from(stemMint).toString('base64').substring(0, 16) + '...'
              return (
                <div key={idx} className="border rounded p-4">
                  <div className="font-semibold mb-2">Stem #{idx + 1}</div>
                  <div className="text-sm text-gray-600 font-mono mb-2">{stemMintAddress}</div>
                  <div className="text-xs text-gray-500">
                    Mint Address: {Buffer.from(stemMint).toString('base64')}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4">
            <Link href={`/track/${id}/stems`}>
              <button className="text-white px-4 py-2 bg-green-600 rounded hover:bg-green-700">
                Manage Stems
              </button>
            </Link>
          </div>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Revenue Splits</h2>
        <div className="border rounded p-4">
          {track.data.contributors.map((contributor: any, idx: number) => {
            // Convert contributor bytes to base58 string for display
            const contributorAddress = Buffer.from(contributor).toString('base64').substring(0, 16) + '...'
            return (
              <div key={idx} className="flex justify-between py-2 border-b last:border-b-0">
                <span className="font-mono text-sm">{contributorAddress}</span>
                <span>{(track.data.shares[idx] / 100).toFixed(2)}%</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Minted NFTs Section */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Stem NFTs</h2>
        {mintedNfts && mintedNfts.length > 0 ? (
          <div className="space-y-3">
            {mintedNfts.map((nft) => {
              const contributorBytes = track.data.contributors[nft.index]
              const contributorAddress = Buffer.from(contributorBytes).toString('base64').substring(0, 16) + '...'
              
              return (
                <div key={nft.index} className="border border-[#FACE68] rounded-lg p-4 bg-[#FACE68]/10">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold">NFT #{nft.index}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        Contributor: <span className="font-mono">{contributorAddress}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 font-mono break-all">
                        Mint: {nft.mintAddress}
                      </div>
                    </div>
                    <span className="text-xs bg-[#FACE68] text-black px-3 py-1 rounded-full font-semibold">Minted</span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="border rounded p-4 text-gray-600">
            No NFTs minted yet. Contributors can mint their NFTs.
          </div>
        )}
        <div className="mt-4">
          <Link href={`/track/${id}/mint-nft`}>
            <button className="text-white px-6 py-3 bg-[#5A9CB5] rounded-lg hover:bg-[#4A8CA5] font-semibold transition shadow-md">
              Mint Stem NFT
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}
