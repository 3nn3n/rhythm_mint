'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useTracksQuery } from '@/features/muzica/data-access/use-tracks-query'
import { useSolana } from '@/components/solana/use-solana'

export default function Home() {
  const { account } = useSolana()
  const { data: tracks } = useTracksQuery({ authority: account?.address })
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration] = useState(180) // 3 minutes
  const [activeTrack, setActiveTrack] = useState<string | null>(null)
  const [masterVolume, setMasterVolume] = useState(85)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)
  const [currentTrackName, setCurrentTrackName] = useState('Demo Track')
  const [waveformHeights, setWaveformHeights] = useState<number[]>([])

  // Generate static waveform heights on mount
  useEffect(() => {
    const heights = Array.from({ length: 60 }, () => Math.random() * 70 + 30)
    setWaveformHeights(heights)
  }, [])

  useEffect(() => {
    // Create audio element
    const audio = new Audio()
    audio.volume = masterVolume / 100
    
    // Select random track from actual tracks or use demo
    let trackUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
    let trackName = 'Demo Track'
    
    if (tracks && tracks.length > 0) {
      // Filter tracks that have a valid CID
      const validTracks = tracks.filter((t: any) => t.account?.data?.cid && t.account.data.cid.length > 5)
      
      if (validTracks.length > 0) {
        const randomTrack = validTracks[Math.floor(Math.random() * validTracks.length)]!
        trackUrl = `https://ipfs.io/ipfs/${randomTrack.account.data.cid}`
        trackName = randomTrack.account.data.title || 'Untitled Track'
        console.log('Playing track from IPFS:', trackUrl)
      }
    }
    
    audio.src = trackUrl
    setCurrentTrackName(trackName)
    
    // Update time as audio plays
    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime)
    })
    
    // Update duration when loaded
    audio.addEventListener('loadedmetadata', () => {
      // Duration will be set from actual audio
    })
    
    // Reset when ended
    audio.addEventListener('ended', () => {
      setIsPlaying(false)
      setCurrentTime(0)
    })
    
    setAudioElement(audio)
    
    return () => {
      audio.pause()
      audio.src = ''
    }
  }, [tracks])

  useEffect(() => {
    if (audioElement) {
      audioElement.volume = masterVolume / 100
    }
  }, [masterVolume, audioElement])

  const togglePlay = () => {
    if (audioElement) {
      if (isPlaying) {
        audioElement.pause()
      } else {
        audioElement.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying && !audioElement) {
      // Fallback animation if audio doesn't load
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= duration) {
            setIsPlaying(false)
            return 0
          }
          return prev + 0.1
        })
      }, 100)
    }
    return () => clearInterval(interval)
  }, [isPlaying, duration, audioElement])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const stems = [
    { name: 'Vocals', color: '#FACE68', active: true, volume: 85, pan: 0 },
    { name: 'Drums', color: '#FA6868', active: true, volume: 90, pan: -10 },
    { name: 'Bass', color: '#5A9CB5', active: true, volume: 80, pan: 5 },
    { name: 'Synth', color: '#FAAC68', active: true, volume: 70, pan: 15 },
  ]

  return (
    <div className="w-full">
      {/* Hero Section - DAW Style */}
      <section className="bg-gradient-to-br from-[#434E78] via-[#473472] to-[#53629E] text-white py-8 px-4 min-h-screen flex items-center">
        <div className="max-w-7xl mx-auto w-full">
          {/* Top Bar */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-[#FACE68] via-[#FAAC68] to-[#FA6868] bg-clip-text text-transparent">
                Muzica Studio
              </h1>
              <p className="text-white/70 text-sm">Web3 Music Production & Distribution Platform</p>
              <p className="text-[#FACE68] text-xs mt-1">Now Playing: {currentTrackName}</p>
            </div>
            <div className="flex gap-3">
              <Link href="/dashboard">
                <button className="bg-gradient-to-r from-[#FACE68] to-[#FAAC68] text-black px-6 py-3 rounded-lg font-semibold hover:shadow-lg hover:shadow-[#FACE68]/30 transition-all hover:scale-105">
                  Launch Studio
                </button>
              </Link>
            </div>
          </div>

          {/* Main DAW Interface */}
          <div className="bg-[#2A2D3E] rounded-2xl shadow-2xl border border-[#607B8F]/30 overflow-hidden">
            {/* Transport Controls */}
            <div className="bg-gradient-to-r from-[#53629E] to-[#607B8F] p-4 flex items-center justify-between border-b border-[#87BAC3]/20">
              <div className="flex items-center gap-4">
                <button
                  onClick={togglePlay}
                  className="w-14 h-14 bg-gradient-to-br from-[#FACE68] to-[#FAAC68] rounded-full flex items-center justify-center hover:shadow-lg hover:shadow-[#FACE68]/40 transition-all"
                >
                  {isPlaying ? (
                    <div className="flex gap-1">
                      <div className="w-1.5 h-5 bg-black rounded-full"></div>
                      <div className="w-1.5 h-5 bg-black rounded-full"></div>
                    </div>
                  ) : (
                    <div className="w-0 h-0 border-l-[10px] border-l-black border-t-[7px] border-t-transparent border-b-[7px] border-b-transparent ml-1"></div>
                  )}
                </button>
                <button className="w-10 h-10 bg-[#607B8F] rounded-lg flex items-center justify-center hover:bg-[#87BAC3] transition">
                  <div className="w-3 h-3 bg-white rounded-sm"></div>
                </button>
                <button 
                  className="w-10 h-10 bg-[#607B8F] rounded-lg flex items-center justify-center hover:bg-[#87BAC3] transition"
                  onClick={() => {
                    if (audioElement) {
                      audioElement.currentTime = 0
                      setCurrentTime(0)
                    }
                  }}
                >
                  <div className="flex gap-0.5">
                    <div className="w-1 h-3 bg-white rounded-full"></div>
                    <div className="w-0 h-0 border-l-[8px] border-l-white border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent"></div>
                  </div>
                </button>
                
                <div className="text-white font-mono text-sm bg-[#2A2D3E] px-4 py-2 rounded-lg">
                  {formatTime(currentTime)} / {formatTime(audioElement?.duration || duration)}
                </div>
                
                <div className="text-white/60 text-xs">
                  120 BPM • 4/4 • C Major
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-white/80 text-sm">Master Volume</div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={masterVolume}
                  onChange={(e) => setMasterVolume(Number(e.target.value))}
                  className="w-24 h-2 bg-[#2A2D3E] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#FACE68] [&::-webkit-slider-thumb]:rounded-full"
                />
                <div className="text-white font-mono text-sm">{masterVolume}%</div>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-[#1E1F2E] p-4 border-b border-[#607B8F]/20">
              <div className="relative h-12 bg-[#2A2D3E] rounded-lg overflow-hidden">
                {/* Time markers */}
                <div className="absolute top-0 left-0 right-0 flex justify-between px-2 pt-1 text-[10px] text-white/40 font-mono">
                  {[0, 30, 60, 90, 120, 150, 180].map((sec) => (
                    <span key={sec}>{formatTime(sec)}</span>
                  ))}
                </div>
                
                {/* Progress bar */}
                <div 
                  className="absolute bottom-0 left-0 h-8 bg-gradient-to-r from-[#FACE68]/30 to-[#FAAC68]/30 border-r-2 border-[#FACE68] transition-all"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                ></div>
                
                {/* Waveform visualization */}
                <div className="absolute bottom-0 left-0 right-0 h-8 flex items-center justify-around px-2">
                  {waveformHeights.map((height, i) => (
                    <div
                      key={i}
                      className="w-0.5 bg-[#87BAC3] rounded-full transition-all"
                      style={{
                        height: `${height}%`,
                        opacity: i / 60 < currentTime / duration ? 1 : 0.3,
                      }}
                    ></div>
                  ))}
                </div>
              </div>
            </div>

            {/* Mixer Section */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 p-6 bg-gradient-to-br from-[#2A2D3E] to-[#1E1F2E]">
              {stems.map((stem, idx) => (
                <div
                  key={stem.name}
                  className="bg-gradient-to-b from-[#3A3D4E] to-[#2A2D3E] rounded-xl p-4 border border-[#607B8F]/30 hover:border-[#87BAC3]/50 transition-all"
                  style={{
                    boxShadow: activeTrack === stem.name ? `0 0 20px ${stem.color}40` : 'none',
                  }}
                  onClick={() => setActiveTrack(stem.name)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full animate-pulse"
                        style={{ backgroundColor: stem.color }}
                      ></div>
                      <h3 className="font-semibold text-white">{stem.name}</h3>
                    </div>
                    <button className="w-8 h-8 bg-[#607B8F] rounded-lg flex items-center justify-center hover:bg-[#87BAC3] transition text-xs">
                      M
                    </button>
                  </div>

                  {/* Level Meter */}
                  <div className="mb-4 h-32 bg-[#1E1F2E] rounded-lg p-2 flex items-end justify-center">
                    <div className="relative w-8 h-full bg-[#2A2D3E] rounded-full overflow-hidden">
                      <div 
                        className="absolute bottom-0 left-0 right-0 rounded-full transition-all"
                        style={{
                          height: `${stem.volume}%`,
                          backgroundColor: stem.color,
                          boxShadow: isPlaying ? `0 0 10px ${stem.color}` : 'none',
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Volume Control */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-white/60 mb-1">
                      <span>Volume</span>
                      <span>{stem.volume}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      defaultValue={stem.volume}
                      className="w-full h-2 bg-[#1E1F2E] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full"
                      style={{
                        ['--thumb-color' as string]: stem.color,
                      }}
                    />
                  </div>

                  {/* Pan Control */}
                  <div>
                    <div className="flex justify-between text-xs text-white/60 mb-1">
                      <span>Pan</span>
                      <span>{stem.pan > 0 ? `R${stem.pan}` : stem.pan < 0 ? `L${Math.abs(stem.pan)}` : 'C'}</span>
                    </div>
                    <input 
                      type="range" 
                      min="-50" 
                      max="50" 
                      defaultValue={stem.pan}
                      className="w-full h-2 bg-[#1E1F2E] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full"
                      style={{
                        ['--thumb-color' as string]: stem.color,
                      }}
                    />
                  </div>

                  {/* Stem Actions */}
                  <div className="mt-4 flex gap-2">
                    <Link href="/dashboard" className="flex-1">
                      <button 
                        className="w-full text-xs py-2 rounded-lg font-semibold transition-all hover:scale-110"
                        style={{
                          backgroundColor: `${stem.color}20`,
                          color: stem.color,
                          border: `1px solid ${stem.color}40`,
                        }}
                      >
                        Mint NFT
                      </button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons Bar */}
            <div className="bg-gradient-to-r from-[#53629E] to-[#607B8F] p-6 grid grid-cols-2 md:grid-cols-4 gap-3 border-t border-[#87BAC3]/20">
              <Link href="/dashboard" className="group">
                <button className="w-full bg-gradient-to-br from-[#FACE68] to-[#FAAC68] text-black py-3 px-4 rounded-lg font-semibold hover:shadow-lg hover:shadow-[#FACE68]/30 transition-all hover:scale-105">
                  <div className="text-2xl mb-1">🎵</div>
                  <div className="text-sm">Create Track</div>
                </button>
              </Link>
              
              <Link href="/dashboard" className="group">
                <button className="w-full bg-gradient-to-br from-[#87BAC3] to-[#5A9CB5] text-white py-3 px-4 rounded-lg font-semibold hover:shadow-lg hover:shadow-[#87BAC3]/30 transition-all hover:scale-105">
                  <div className="text-2xl mb-1">💰</div>
                  <div className="text-sm">Set Royalties</div>
                </button>
              </Link>
              
              <Link href="/dashboard" className="group">
                <button className="w-full bg-gradient-to-br from-[#FA6868] to-[#E97F4A] text-white py-3 px-4 rounded-lg font-semibold hover:shadow-lg hover:shadow-[#FA6868]/30 transition-all hover:scale-105">
                  <div className="text-2xl mb-1">🖼️</div>
                  <div className="text-sm">Mint Stem NFT</div>
                </button>
              </Link>
              
              <Link href="/dashboard" className="group">
                <button className="w-full bg-gradient-to-br from-[#F7E396] to-[#FACE68] text-black py-3 px-4 rounded-lg font-semibold hover:shadow-lg hover:shadow-[#F7E396]/30 transition-all hover:scale-105">
                  <div className="text-2xl mb-1">📊</div>
                  <div className="text-sm">View Analytics</div>
                </button>
              </Link>
              
              <Link href="/dashboard" className="group">
                <button className="w-full bg-gradient-to-br from-[#D6F4ED] to-[#87BAC3] text-gray-900 py-3 px-4 rounded-lg font-semibold hover:shadow-lg hover:shadow-[#D6F4ED]/30 transition-all hover:scale-105">
                  <div className="text-2xl mb-1">🏦</div>
                  <div className="text-sm">Escrow Vault</div>
                </button>
              </Link>
              
              <Link href="/dashboard" className="group">
                <button className="w-full bg-gradient-to-br from-[#473472] to-[#53629E] text-white py-3 px-4 rounded-lg font-semibold hover:shadow-lg hover:shadow-[#473472]/30 transition-all border border-[#87BAC3]/30 hover:scale-105">
                  <div className="text-2xl mb-1">👥</div>
                  <div className="text-sm">Collaborators</div>
                </button>
              </Link>
              
              <Link href="/dashboard" className="group">
                <button className="w-full bg-gradient-to-br from-[#607B8F] to-[#434E78] text-white py-3 px-4 rounded-lg font-semibold hover:shadow-lg hover:shadow-[#607B8F]/30 transition-all border border-[#87BAC3]/30 hover:scale-105">
                  <div className="text-2xl mb-1">🔄</div>
                  <div className="text-sm">Distribute</div>
                </button>
              </Link>
              
              <Link href="/dashboard" className="group">
                <button className="w-full bg-gradient-to-br from-[#FAAC68] to-[#FA6868] text-white py-3 px-4 rounded-lg font-semibold hover:shadow-lg hover:shadow-[#FAAC68]/30 transition-all hover:scale-105">
                  <div className="text-2xl mb-1">⚡</div>
                  <div className="text-sm">Deploy Track</div>
                </button>
              </Link>
            </div>

            {/* Status Bar */}
            <div className="bg-[#1E1F2E] px-6 py-3 flex items-center justify-between text-xs text-white/60 border-t border-[#607B8F]/20">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Connected to Solana</span>
                </div>
                <div>Sample Rate: 44.1 kHz</div>
                <div>Bit Depth: 24-bit</div>
              </div>
              <div className="flex items-center gap-4">
                <div>CPU: 12%</div>
                <div>Latency: 2.3ms</div>
                <div className="font-mono text-[#FACE68]">LIVE</div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-[#FACE68]/20 to-[#FAAC68]/10 border border-[#FACE68]/30 rounded-lg p-4 backdrop-blur-sm transition-transform hover:scale-105 cursor-pointer">
              <div className="text-3xl font-bold text-[#FACE68]">10K+</div>
              <div className="text-white/70 text-sm">Tracks Created</div>
            </div>
            <div className="bg-gradient-to-br from-[#5A9CB5]/20 to-[#87BAC3]/10 border border-[#5A9CB5]/30 rounded-lg p-4 backdrop-blur-sm transition-transform hover:scale-105 cursor-pointer">
              <div className="text-3xl font-bold text-[#87BAC3]">$2M+</div>
              <div className="text-white/70 text-sm">Royalties Distributed</div>
            </div>
            <div className="bg-gradient-to-br from-[#FA6868]/20 to-[#E97F4A]/10 border border-[#FA6868]/30 rounded-lg p-4 backdrop-blur-sm transition-transform hover:scale-105 cursor-pointer">
              <div className="text-3xl font-bold text-[#FA6868]">50K+</div>
              <div className="text-white/70 text-sm">Stem NFTs Minted</div>
            </div>
            <div className="bg-gradient-to-br from-[#F7E396]/20 to-[#FACE68]/10 border border-[#F7E396]/30 rounded-lg p-4 backdrop-blur-sm transition-transform hover:scale-105 cursor-pointer">
              <div className="text-3xl font-bold text-[#F7E396]">5K+</div>
              <div className="text-white/70 text-sm">Active Artists</div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 1 - The Problem */}
      <section className="py-20 px-4 bg-gradient-to-b from-[#F7E396] to-[#E97F4A]/20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-5xl font-bold text-center mb-6 text-gray-900">
            The Music Industry Is Broken. We're Fixing It.
          </h2>
          <p className="text-xl text-gray-900 text-center mb-12 max-w-4xl mx-auto">
            Billions are lost to piracy, platforms hide real numbers, and artists rarely receive the royalties they deserve.
            Contributors, producers, session artists and engineers have no visibility into how much a track makes or if they're paid fairly.
          </p>
          
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div className="bg-gradient-to-br from-[#87BAC3]/30 to-[#D6F4ED]/50 p-6 rounded-lg shadow-md border-l-4 border-[#FA6868] transition-transform hover:scale-105 cursor-pointer">
              <div className="text-3xl mb-2"></div>
              <h3 className="font-semibold text-lg mb-2 text-gray-900">Piracy and unauthorized distribution</h3>
            </div>
            <div className="bg-gradient-to-br from-[#87BAC3]/30 to-[#D6F4ED]/50 p-6 rounded-lg shadow-md border-l-4 border-[#FA6868] transition-transform hover:scale-105 cursor-pointer">
              <div className="text-3xl mb-2"></div>
              <h3 className="font-semibold text-lg mb-2 text-gray-900">Zero transparency on streaming payouts</h3>
            </div>
            <div className="bg-gradient-to-br from-[#87BAC3]/30 to-[#D6F4ED]/50 p-6 rounded-lg shadow-md border-l-4 border-[#FA6868] transition-transform hover:scale-105 cursor-pointer">
              <div className="text-3xl mb-2"></div>
              <h3 className="font-semibold text-lg mb-2 text-gray-900">Delayed & unfair royalty splitting</h3>
            </div>
            <div className="bg-gradient-to-br from-[#87BAC3]/30 to-[#D6F4ED]/50 p-6 rounded-lg shadow-md border-l-4 border-[#FA6868] transition-transform hover:scale-105 cursor-pointer">
              <div className="text-3xl mb-2"></div>
              <h3 className="font-semibold text-lg mb-2 text-gray-900">No system for stem ownership or monetization</h3>
            </div>
            <div className="bg-gradient-to-br from-[#87BAC3]/30 to-[#D6F4ED]/50 p-6 rounded-lg shadow-md border-l-4 border-[#FA6868] transition-transform hover:scale-105 cursor-pointer">
              <div className="text-3xl mb-2"></div>
              <h3 className="font-semibold text-lg mb-2 text-gray-900">Middlemen controlling creator revenue</h3>
            </div>
            <div className="bg-gradient-to-br from-[#87BAC3]/30 to-[#D6F4ED]/50 p-6 rounded-lg shadow-md border-l-4 border-[#FA6868] transition-transform hover:scale-105 cursor-pointer">
              <div className="text-3xl mb-2"></div>
              <h3 className="font-semibold text-lg mb-2 text-gray-900">No Ownership Proof for Stems</h3>
            </div>
          </div>

          <div className="bg-gradient-to-r from-[#FAAC68] to-[#FA6868] text-white p-8 rounded-xl text-center shadow-xl transition-transform hover:scale-105 cursor-pointer">
            <p className="text-2xl font-bold">
              We built the first end-to-end music protocol where every note, every stem, and every payment is on-chain — verifiable by anyone.
            </p>
          </div>
        </div>
      </section>

      {/* Section 2 - Our Solution */}
      <section className="py-20 px-4 bg-gradient-to-b from-[#D6F4ED] to-[#87BAC3]/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-5xl font-bold text-center mb-6 text-gray-900">
            A Transparent, On-Chain Music Economy
          </h2>
          <p className="text-xl text-gray-700 text-center mb-12 max-w-4xl mx-auto">
            Our platform transforms music distribution into an open, programmable, trustless system — 
            giving creators full control of their catalog, royalties, and fans.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-[#87BAC3]/30 to-[#D6F4ED]/50 p-6 rounded-lg shadow-md border border-[#5A9CB5]/20 transition-transform hover:scale-105 cursor-pointer">
              <div className="text-3xl mb-4">🎵</div>
              <h3 className="font-bold text-xl mb-3 text-gray-900">On-chain Track Identity</h3>
              <p className="text-gray-600">
                Every track has a unique, tamper-proof on-chain record (metadata + contributors + shares + stems).
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#87BAC3]/30 to-[#D6F4ED]/50 p-6 rounded-lg shadow-md border border-[#5A9CB5]/20 transition-transform hover:scale-105 cursor-pointer">
              <div className="text-3xl mb-4">💰</div>
              <h3 className="font-bold text-xl mb-3 text-gray-900">Programmable Royalty Splits</h3>
              <p className="text-gray-600">
                Shares are stored on-chain and enforced automatically. No spreadsheets. No disputes.
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#87BAC3]/30 to-[#D6F4ED]/50 p-6 rounded-lg shadow-md border border-[#5A9CB5]/20 transition-transform hover:scale-105 cursor-pointer">
              <div className="text-3xl mb-4">🏦</div>
              <h3 className="font-bold text-xl mb-3 text-gray-900">Escrow-Based Royalty Distribution</h3>
              <p className="text-gray-600">
                All revenue flows into a verifiable escrow account and is distributed instantly to contributors.
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#87BAC3]/30 to-[#D6F4ED]/50 p-6 rounded-lg shadow-md border border-[#5A9CB5]/20 transition-transform hover:scale-105 cursor-pointer">
              <div className="text-3xl mb-4">🔒</div>
              <h3 className="font-bold text-xl mb-3 text-gray-900">Anti-Piracy via Provenance</h3>
              <p className="text-gray-600">
                Listeners and platforms can verify track authenticity through on-chain fingerprints.
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#87BAC3]/30 to-[#D6F4ED]/50 p-6 rounded-lg shadow-md border border-[#5A9CB5]/20 transition-transform hover:scale-105 cursor-pointer">
              <div className="text-3xl mb-4">🖼️</div>
              <h3 className="font-bold text-xl mb-3 text-gray-900">Stem NFTs & Fractional Ownership</h3>
              <p className="text-gray-600">
                Stems can be minted as collectibles — unlocking fan investments and new monetization.
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#87BAC3]/30 to-[#D6F4ED]/50 p-6 rounded-lg shadow-md border border-[#5A9CB5]/20 transition-transform hover:scale-105 cursor-pointer">
              <div className="text-3xl mb-4">⚡</div>
              <h3 className="font-bold text-xl mb-3 text-gray-900">Instant Settlements</h3>
              <p className="text-gray-600">
                No waiting 90 days. Payments are processed instantly on Solana's lightning-fast network.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3 - Built for Everyone */}
      <section className="py-20 px-4 bg-gradient-to-b from-[#FACE68]/40 to-[#F7E396]/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-5xl font-bold text-center mb-6 text-white">
            Everyone Who Contributes Gets Paid Fairly
          </h2>
          <p className="text-xl text-white-500 text-center mb-12 max-w-4xl mx-auto">
            Instead of fighting over splits or chasing down payments, your royalty distribution becomes automated and frictionless.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-[#F7E396]/50 to-[#FACE68]/30 p-6 rounded-lg shadow-md text-center border border-[#FAAC68]/30">
              <div className="text-5xl mb-4">🎤</div>
              <h3 className="font-bold text-xl mb-3 text-gray-900">Artists</h3>
              <p className="text-gray-900">
                Publish tracks, set shares, upload stems, and earn transparently.
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#F7E396]/50 to-[#FACE68]/30 p-6 rounded-lg shadow-md text-center border border-[#FAAC68]/30">
              <div className="text-5xl mb-4">🎚️</div>
              <h3 className="font-bold text-xl mb-3 text-gray-900">Producers</h3>
              <p className="text-gray-900">
                Receive guaranteed payouts for their contributions — instantly.
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#F7E396]/50 to-[#FACE68]/30 p-6 rounded-lg shadow-md text-center border border-[#FAAC68]/30">
              <div className="text-5xl mb-4">🎧</div>
              <h3 className="font-bold text-xl mb-3 text-gray-900">Engineers</h3>
              <p className="text-gray-900">
                Finally get recognized and paid for their work.
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#F7E396]/50 to-[#FACE68]/30 p-6 rounded-lg shadow-md text-center border border-[#FAAC68]/30">
              <div className="text-5xl mb-4">🖼️</div>
              <h3 className="font-bold text-xl mb-3 text-gray-900">Fans</h3>
              <p className="text-gray-900">
                Collect stem NFTs, support artists directly, own pieces of music.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4 - Transparent Royalty Distribution */}
      <section className="py-20 px-4 bg-gradient-to-b from-[#473472] to-[#53629E] text-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-5xl font-bold text-center mb-6 text-white">
            No More Hidden Revenues. Ever.
          </h2>
          <p className="text-xl text-white/90 text-center mb-12 max-w-4xl mx-auto">
            Every payment routed to a track goes into a public escrow vault controlled by a PDA — not by us, not by labels.
          </p>

          <div className="bg-[#53629E]/40 backdrop-blur-sm rounded-xl shadow-xl p-8 mb-8 border border-[#87BAC3]/30 transition-transform hover:scale-105 cursor-pointer">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1 text-center">
                <div className="text-4xl mb-3">💵</div>
                <p className="font-semibold text-white">Revenue sent → track escrow</p>
              </div>
              <div className="text-3xl text-[#FACE68]">→</div>
              <div className="flex-1 text-center">
                <div className="text-4xl mb-3">🧮</div>
                <p className="font-semibold text-white">Protocol calculates payout using on-chain shares</p>
              </div>
              <div className="text-3xl text-[#FACE68]">→</div>
              <div className="flex-1 text-center">
                <div className="text-4xl mb-3">💳</div>
                <p className="font-semibold text-white">Tokens sent directly to contributors' wallets</p>
              </div>
              <div className="text-3xl text-[#FACE68]">→</div>
              <div className="flex-1 text-center">
                <div className="text-4xl mb-3">✅</div>
                <p className="font-semibold text-white">Every distribution is verifiable on-chain</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-[#87BAC3] to-[#D6F4ED] text-gray-900 p-8 rounded-xl text-center shadow-xl transition-transform hover:scale-105 cursor-pointer">
            <p className="text-3xl font-bold">
              If a track earns ₹1… everyone sees it. Everyone gets paid.
            </p>
          </div>
        </div>
      </section>

      {/* Section 5 - Stem-Based Creativity */}
      <section className="py-20 px-4 bg-gradient-to-b from-[#F7E396] to-[#E97F4A]/20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-5xl font-bold text-center mb-6 text-gray-900">
            Music Isn't Just Tracks — It's Stems. We Monetize Them.
          </h2>
          <p className="text-xl text-gray-900 text-center mb-12 max-w-4xl mx-auto">
            Creators can mint each stem (vocals, drums, bass, synth) as an NFT — enabling:
          </p>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="bg-gradient-to-r from-[#FACE68] via-[#FAAC68] to-[#FA6868] p-8 rounded-lg shadow-md border border-[#E97F4A]/30 transition-transform hover:scale-105 cursor-pointer">
              <div className="text-4xl mb-4">🎼</div>
              <h3 className="font-bold text-2xl mb-3 text-gray-900">Stem Marketplaces</h3>
              <p className="text-gray-900">
                Buy, sell, and trade individual stems as NFTs on open marketplaces.
              </p>
            </div>

            <div className="bg-gradient-to-r from-[#FACE68] via-[#FAAC68] to-[#FA6868] p-8 rounded-lg shadow-md border border-[#E97F4A]/30 transition-transform hover:scale-105 cursor-pointer">
              <div className="text-4xl mb-4">🔄</div>
              <h3 className="font-bold text-2xl mb-3 text-gray-900">Remixes with Licensing</h3>
              <p className="text-gray-900">
                Artists can remix stems with built-in licensing and automatic royalty attribution.
              </p>
            </div>

            <div className="bg-gradient-to-r from-[#FACE68] via-[#FAAC68] to-[#FA6868] p-8 rounded-lg shadow-md border border-[#E97F4A]/30 transition-transform hover:scale-105 cursor-pointer">
              <div className="text-4xl mb-4">🤝</div>
              <h3 className="font-bold text-2xl mb-3 text-gray-900">Fan-Backed Ownership</h3>
              <p className="text-gray-900">
                Fans can own pieces of their favorite songs and participate in their success.
              </p>
            </div>

            <div className="bg-gradient-to-r from-[#FACE68] via-[#FAAC68] to-[#FA6868] p-8 rounded-lg shadow-md border border-[#E97F4A]/30 transition-transform hover:scale-105 cursor-pointer">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="font-bold text-2xl mb-3 text-gray-900">Transparent Derivatives</h3>
              <p className="text-gray-900">
                All derivative works are tracked on-chain with verifiable provenance.
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-[#FACE68] to-[#FAAC68] text-black p-8 rounded-xl text-center shadow-xl transition-transform hover:scale-105 cursor-pointer">
            <p className="text-2xl font-bold">
              Stems become digital assets — owned, traded, licensed, monetized.
            </p>
          </div>
        </div>
      </section>

      {/* Section 6 - Powered by Solana */}
      <section className="py-20 px-4 bg-gradient-to-br from-[#434E78] via-[#53629E] to-[#607B8F] text-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-5xl font-bold text-center mb-6 text-white">
            Fast. Cheap. Reliable. Perfect for Music.
          </h2>
          <p className="text-xl text-white/90 text-center mb-12 max-w-4xl mx-auto">
            Our protocol leverages Solana's high throughput and low fees to deliver:
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div className="bg-[#607B8F]/30 backdrop-blur-sm p-6 rounded-lg border border-[#87BAC3]/30 transition-transform hover:scale-105 cursor-pointer">
              <div className="text-4xl mb-3">⚡</div>
              <h3 className="font-bold text-xl mb-2 text-white">Lightning-fast transactions</h3>
              <p className="text-white/80">Instant payouts with sub-second finality</p>
            </div>

            <div className="bg-[#607B8F]/30 backdrop-blur-sm p-6 rounded-lg border border-[#87BAC3]/30 transition-transform hover:scale-105 cursor-pointer">
              <div className="text-4xl mb-3">🪙</div>
              <h3 className="font-bold text-xl mb-2 text-white">Near-zero fees</h3>
              <p className="text-white/80">Fractions of a cent per transaction</p>
            </div>

            <div className="bg-[#607B8F]/30 backdrop-blur-sm p-6 rounded-lg border border-[#87BAC3]/30">
              <div className="text-4xl mb-3">🔐</div>
              <h3 className="font-bold text-xl mb-2 text-white">Bank-grade security</h3>
              <p className="text-white/80">Military-grade cryptography protecting your assets</p>
            </div>

            <div className="bg-[#607B8F]/30 backdrop-blur-sm p-6 rounded-lg border border-[#87BAC3]/30">
              <div className="text-4xl mb-3">🌐</div>
              <h3 className="font-bold text-xl mb-2 text-white">Global accessibility</h3>
              <p className="text-white/80">Access from anywhere in the world, instantly</p>
            </div>
          </div>

          <div className="text-center">
            <p className="text-xl mb-4 text-white">Our protocol enables:</p>
            <div className="flex flex-wrap justify-center gap-4">
              <span className="bg-[#FACE68]/30 px-6 py-3 rounded-full font-semibold">Instant payouts</span>
              <span className="bg-[#FACE68]/30 px-6 py-3 rounded-full font-semibold">Micro-royalties</span>
              <span className="bg-[#FACE68]/30 px-6 py-3 rounded-full font-semibold">On-chain audio fingerprinting</span>
              <span className="bg-[#FACE68]/30 px-6 py-3 rounded-full font-semibold">High-frequency licensing</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section 7 - Features Grid */}
      <section className="py-20 px-4 bg-gradient-to-b from-[#D6F4ED] to-[#87BAC3]/20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-5xl font-bold text-center mb-12 text-gray-900">
            What You Can Do on Our Platform
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-[#87BAC3]/40 to-[#D6F4ED]/60 p-6 rounded-lg shadow-md text-center hover:shadow-xl transition border border-[#607B8F]/30">
              <div className="text-4xl mb-3">🎵</div>
              <p className="font-semibold text-gray-900">Create a track on-chain</p>
            </div>

            <div className="bg-gradient-to-br from-[#5A9CB5]/15 to-[#5A9CB5]/5 p-6 rounded-lg shadow-md text-center hover:shadow-xl transition border border-[#5A9CB5]/20">
              <div className="text-4xl mb-3">🎚</div>
              <p className="font-semibold text-gray-900">Upload stems & mint stem NFTs</p>
            </div>

            <div className="bg-gradient-to-br from-[#87BAC3]/40 to-[#D6F4ED]/60 p-6 rounded-lg shadow-md text-center hover:shadow-xl transition border border-[#607B8F]/30">
              <div className="text-4xl mb-3">💸</div>
              <p className="font-semibold text-gray-900">Set royalty splits</p>
            </div>

            <div className="bg-gradient-to-br from-[#87BAC3]/40 to-[#D6F4ED]/60 p-6 rounded-lg shadow-md text-center hover:shadow-xl transition border border-[#607B8F]/30">
              <div className="text-4xl mb-3">🔁</div>
              <p className="font-semibold text-gray-900">Update contributors anytime</p>
            </div>

            <div className="bg-gradient-to-br from-[#87BAC3]/40 to-[#D6F4ED]/60 p-6 rounded-lg shadow-md text-center hover:shadow-xl transition border border-[#607B8F]/30">
              <div className="text-4xl mb-3">🏦</div>
              <p className="font-semibold text-gray-900">Deposit revenue into escrow</p>
            </div>

            <div className="bg-gradient-to-br from-[#87BAC3]/40 to-[#D6F4ED]/60 p-6 rounded-lg shadow-md text-center hover:shadow-xl transition border border-[#607B8F]/30">
              <div className="text-4xl mb-3">💰</div>
              <p className="font-semibold text-gray-900">Distribute royalties instantly</p>
            </div>

            <div className="bg-gradient-to-br from-[#87BAC3]/40 to-[#D6F4ED]/60 p-6 rounded-lg shadow-md text-center hover:shadow-xl transition border border-[#607B8F]/30">
              <div className="text-4xl mb-3">🎧</div>
              <p className="font-semibold text-gray-900">Publish a public track page</p>
            </div>

            <div className="bg-gradient-to-br from-[#87BAC3]/40 to-[#D6F4ED]/60 p-6 rounded-lg shadow-md text-center hover:shadow-xl transition border border-[#607B8F]/30">
              <div className="text-4xl mb-3">🖼</div>
              <p className="font-semibold text-gray-900">Create collectible NFTs</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 8 - Vision */}
      <section className="py-20 px-4 bg-gradient-to-br from-[#473472] via-[#434E78] to-[#53629E] text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-bold mb-6 text-white">
            A Music Ecosystem Where Artists Own Everything
          </h2>
          <p className="text-xl text-white/90 mb-8">
            We believe music should be transparent, fair, and creator-controlled — not dominated by opaque intermediaries.
            Our mission is to build the new standard for music rights, royalties, and ownership on Web3.
          </p>
          <div className="bg-[#53629E]/40 backdrop-blur-sm p-8 rounded-xl border border-[#87BAC3]/30 transition-transform hover:scale-105 cursor-pointer">
            <p className="text-2xl font-semibold mb-2 text-white">Our Vision</p>
            <p className="text-lg text-white/90">
              A world where every artist, producer, and contributor is fairly compensated, 
              every transaction is transparent, and music ownership is democratized through blockchain technology.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-[#FACE68] via-[#FAAC68] to-[#FA6868] text-black">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-bold mb-6 text-black">
            Let's Build the Future of Music, Together
          </h2>
          <div className="flex justify-center mb-8">
            <Link href="/create-track">
              <button className="bg-[#5A9CB5] text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-[#4A8CA5] transition-all shadow-lg hover:scale-105">
                Create Your First Track
              </button>
            </Link>
          </div>
          <p className="text-xl font-bold">
            100% on-chain. 0% middlemen.
          </p>
        </div>
      </section>
    </div>
  )
}
