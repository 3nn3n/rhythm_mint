'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSolana } from '@/components/solana/use-solana'
import { toast } from 'sonner'
import { useTrackQuery } from '@/features/muzica/data-access/use-track-query'
import { useUpdateSharesMutation } from '@/features/muzica/data-access/use-update-shares-mutation'
import { getAddressDecoder } from 'gill'

export default function SplitsPage() {
  const params = useParams()
  const id = params.id as string
  const { account } = useSolana()
  
  const { data: track, isLoading } = useTrackQuery({ trackAddress: id })
  const updateSharesMutation = useUpdateSharesMutation()
  
  const [contributors, setContributors] = useState([
    { address: '', share: 0 },
  ])
  
  // Load current contributors and shares from track
  useEffect(() => {
    if (track?.data) {
      const addressDecoder = getAddressDecoder()
      const loadedContributors = track.data.contributors.map((contributorBytes: number[], idx: number) => {
        const address = addressDecoder.decode(new Uint8Array(contributorBytes))
        const share = track.data.shares[idx] / 100 // Convert basis points to percentage
        return { address, share }
      })
      setContributors(loadedContributors)
    }
  }, [track])

  const addContributor = () => {
    setContributors([...contributors, { address: '', share: 0 }])
  }

  const removeContributor = (index: number) => {
    setContributors(contributors.filter((_, i) => i !== index))
  }

  const updateContributor = (index: number, field: 'address' | 'share', value: string | number) => {
    const updated = [...contributors]
    updated[index] = { ...updated[index], [field]: value }
    setContributors(updated)
  }

  const totalShare = contributors.reduce((sum, c) => sum + Number(c.share), 0)

  const updateSplits = async () => {
    if (totalShare !== 100) {
      toast.error('Total shares must equal 100%')
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

    try {
      // Convert shares to basis points (multiply by 100)
      const sharesBps = contributors.map(c => Math.round(c.share * 100))
      const addresses = contributors.map(c => c.address)
      
      await updateSharesMutation.mutateAsync({
        trackAddress: id,
        trackId: track.data.trackId,
        contributors: addresses,
        sharesBps: sharesBps,
      })
    } catch (error) {
      console.error('Error updating splits:', error)
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

  const isUpdating = updateSharesMutation.isPending

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link href={`/track/${id}`}>
        <button className="mb-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-medium transition flex items-center gap-2">
          <span>←</span> Back to Track
        </button>
      </Link>
      <h1 className="text-2xl font-bold mb-6">Revenue Splits - {track.data.title}</h1>
      
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
        <p className="text-sm text-blue-900">
          <strong>Note:</strong> Only the track authority can update revenue splits. 
          Changes will increment the royalty version number.
        </p>
      </div>

      <div className="space-y-4">
        {contributors.map((contributor, index) => (
          <div key={index} className="flex gap-4 items-start">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Contributor Address</label>
              <input
                value={contributor.address}
                onChange={(e) => updateContributor(index, 'address', e.target.value)}
                className="border rounded p-2 w-full font-mono text-sm"
                placeholder="Solana wallet address"
                disabled={isUpdating}
              />
            </div>
            <div className="w-32">
              <label className="block text-sm font-medium mb-2">Share (%)</label>
              <input
                type="number"
                value={contributor.share}
                onChange={(e) => updateContributor(index, 'share', Number(e.target.value))}
                className="border rounded p-2 w-full"
                min="0"
                max="100"
                step="0.01"
                disabled={isUpdating}
              />
            </div>
            <div className="pt-8">
              <button
                onClick={() => removeContributor(index)}
                disabled={contributors.length === 1 || isUpdating}
                className="px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        <button
          onClick={addContributor}
          disabled={isUpdating}
          className="px-4 py-2 bg-gray-900 rounded hover:bg-gray-600 disabled:opacity-50"
        >
          + Add Contributor
        </button>

        <div className="pt-4 border-t">
          <div className="flex justify-between items-center mb-4">
            <span className="font-semibold">Total:</span>
            <span
              className={`font-bold ${
                totalShare === 100 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {totalShare.toFixed(2)}%
            </span>
          </div>

          <button
            onClick={updateSplits}
            disabled={isUpdating || !account?.address || totalShare !== 100}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isUpdating ? 'Updating...' : 'Update Revenue Splits'}
          </button>
        </div>
      </div>
    </div>
  )
}
