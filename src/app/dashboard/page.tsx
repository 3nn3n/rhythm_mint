'use client'

import { useSolana } from '@/components/solana/use-solana'
import Link from 'next/link'
import { useContributorTracksQuery } from '@/features/muzica/data-access/use-contributor-tracks-query'

export default function Dashboard() {
  const { account } = useSolana()
  const { data: tracks, isLoading } = useContributorTracksQuery({ walletAddress: account?.address })

  if (!account) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <p className="text-muted-foreground">Please connect your wallet to view your dashboard.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <p className="text-muted-foreground">Loading your tracks...</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div>
          <Link href="/create-track">
            <button className="px-6 py-2 bg-[#FACE68] text-black rounded-lg hover:bg-[#FAAC68] font-semibold transition shadow-md">
              Create Track
            </button>
          </Link>
        </div>
      </div>

      <section className="mt-6">
        <h2 className="font-semibold text-lg mb-4">My Tracks & Collaborations</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Tracks you created or where you're listed as a contributor
        </p>
        {tracks && tracks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tracks.map((t: any) => (
              <div key={t.pubkey} className="border rounded p-4">
                <h3 className="font-bold">{t.account.data.title || 'Untitled Track'}</h3>
                <div className="text-sm text-muted-foreground mt-1">
                  Track ID: {t.account.data.trackId?.toString() || 'N/A'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {t.account.data.contributors.length} contributor(s)
                </div>
                <div className="mt-4 flex gap-2">
                  <Link href={`/track/${t.pubkey}`}>
                    <button className="text-black px-4 py-2 bg-[#5A9CB5] text-white rounded-lg hover:bg-[#4A8CA5] font-medium transition">Manage</button>
                  </Link>
                  <Link href={`/track/${t.pubkey}/stems`}>
                    <button className="text-black px-4 py-2 bg-white border-2 border-[#5A9CB5] rounded-lg hover:bg-gray-50 font-medium transition">Stems</button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">
            No tracks yet. <Link href="/create-track" className="text-[#5A9CB5] hover:text-[#4A8CA5] font-semibold underline">Create your first track</Link>
          </p>
        )}
      </section>
    </div>
  )
}