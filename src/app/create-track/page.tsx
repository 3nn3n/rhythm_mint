'use client'

import { useState } from 'react'
import { useSolana } from '@/components/solana/use-solana'
import { toast } from 'sonner'
import { useInitializeTrackMutation } from '@/features/muzica/data-access/use-initialize-track-mutation'
import { useRouter } from 'next/navigation'

type Contributor = {
  address: string
  share: number // in basis points (100 = 1%)
}

export default function CreateTrack() {
  const { account } = useSolana()
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [cid, setCid] = useState('')
  const [contributors, setContributors] = useState<Contributor[]>([
    { address: '', share: 10000 } // Default to creator with 100%
  ])

  const initializeTrack = useInitializeTrackMutation()

  const addContributor = () => {
    setContributors([...contributors, { address: '', share: 0 }])
  }

  const removeContributor = (index: number) => {
    setContributors(contributors.filter((_, i) => i !== index))
  }

  const updateContributor = (index: number, field: 'address' | 'share', value: string | number) => {
    const updated = [...contributors]
    if (field === 'address') {
      updated[index].address = value as string
    } else {
      updated[index].share = Number(value)
    }
    setContributors(updated)
  }

  const getTotalShares = () => {
    return contributors.reduce((sum, c) => sum + c.share, 0)
  }

  const create = async () => {
    if (!account?.address) {
      toast.error('Please connect your wallet first')
      return
    }

    if (!title.trim() || !cid.trim()) {
      toast.error('Please fill in all fields')
      return
    }

    // Validate contributors
    const filledContributors = contributors.filter(c => c.address.trim())
    if (filledContributors.length === 0) {
      toast.error('Add at least one contributor')
      return
    }

    // Validate addresses are proper base58
    for (const contributor of filledContributors) {
      const addr = contributor.address.trim()
      if (addr.length < 32 || addr.length > 44) {
        toast.error(`Invalid wallet address: ${addr.substring(0, 20)}...`)
        return
      }
    }

    const totalShares = filledContributors.reduce((sum, c) => sum + c.share, 0)
    if (totalShares !== 10000) {
      toast.error(`Total shares must equal 100% (currently ${totalShares / 100}%)`)
      return
    }

    try {
      const trackId = BigInt(Date.now())
      const masterHash = new Uint8Array(32) // Placeholder hash
      
      await initializeTrack.mutateAsync({
        trackId,
        title,
        cid,
        masterHash,
        contributors: filledContributors.map(c => c.address.trim()),
        sharesBps: filledContributors.map(c => c.share),
      })

      setTitle('')
      setCid('')
      setContributors([{ address: '', share: 10000 }])
      
      // Redirect to dashboard
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)
    } catch (error) {
      // Error already handled in mutation
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create Track</h1>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border rounded p-2 w-full"
            placeholder="Enter track title"
            disabled={initializeTrack.isPending}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Main file CID (IPFS)</label>
          <input
            value={cid}
            onChange={(e) => setCid(e.target.value)}
            className="border rounded p-2 w-full"
            placeholder="QmXxx..."
            disabled={initializeTrack.isPending}
          />
        </div>

        {/* Contributors Section */}
        <div className="border-t pt-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold">Contributors & Revenue Splits</h3>
              <p className="text-sm text-muted-foreground">
                Total: {getTotalShares() / 100}% {getTotalShares() !== 10000 && <span className="text-red-600">(Must be 100%)</span>}
              </p>
            </div>
            <button
              onClick={addContributor}
              disabled={initializeTrack.isPending}
              className="px-4 py-2 bg-[#FACE68] text-black text-sm rounded-lg hover:bg-[#FAAC68] disabled:bg-gray-400 font-semibold transition shadow-md"
            >
              + Add Contributor
            </button>
          </div>

          <div className="space-y-3">
            {contributors.map((contributor, index) => (
              <div key={index} className="flex gap-2 items-start border rounded p-3 bg-gray-50">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-black block text-xs font-medium">Wallet Address</label>
                    {index === 0 && account?.address && (
                      <button
                        type="button"
                        onClick={() => updateContributor(0, 'address', account.address)}
                        className="text-xs text-[#5A9CB5] hover:text-[#4A8CA5] font-semibold underline"
                        disabled={initializeTrack.isPending}
                      >
                        Use my wallet
                      </button>
                    )}
                  </div>
                  <input
                    value={contributor.address}
                    onChange={(e) => updateContributor(index, 'address', e.target.value)}
                    className="border bg-gray-900 rounded p-2 w-full text-sm font-mono"
                    placeholder={index === 0 ? "Your wallet (creator)" : "Contributor wallet address"}
                    disabled={initializeTrack.isPending}
                  />
                </div>
                <div className="w-32">
                  <label className="text-black block text-xs font-medium mb-1">Share %</label>
                  <input
                    type="number"
                    value={contributor.share / 100}
                    onChange={(e) => updateContributor(index, 'share', parseFloat(e.target.value || '0') * 100)}
                    className="text-white bg-gray-900 border rounded p-2 w-full text-sm"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    max="100"
                    disabled={initializeTrack.isPending}
                  />
                </div>
                {contributors.length > 1 && (
                  <button
                    onClick={() => removeContributor(index)}
                    disabled={initializeTrack.isPending}
                    className="mt-5 px-3 py-2 bg-[#FA6868] text-white text-sm rounded-lg hover:bg-[#EA5858] disabled:bg-gray-400 font-medium transition"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-[#5A9CB5]/10 border border-[#5A9CB5]/30 rounded-lg text-sm">
            <p className="text-gray-800 dark:text-gray-200">
              <strong>Tip:</strong> Set the first contributor to your own wallet address. 
              Each contributor can mint one stem NFT based on their position in this list.
            </p>
          </div>
        </div>

        <div className="pt-4">
          <button
            onClick={create}
            disabled={initializeTrack.isPending || !account?.address}
            className="px-6 py-3 bg-[#5A9CB5] text-white rounded-lg hover:bg-[#4A8CA5] disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold transition shadow-md"
          >
            {initializeTrack.isPending ? 'Creating...' : 'Create Track'}
          </button>
        </div>
      </div>
    </div>
  )
}
