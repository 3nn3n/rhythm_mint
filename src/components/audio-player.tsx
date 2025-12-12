'use client'

import React, { useEffect, useRef, useState } from 'react'

type Props = { src: string; title?: string }

export function AudioPlayer({ src, title }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!src) return
    const audio = new Audio(src)
    audioRef.current = audio

    const onTime = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100)
      }
    }

    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', () => setPlaying(false))

    return () => {
      audio.pause()
      audio.src = ''
      audio.removeEventListener('timeupdate', onTime)
    }
  }, [src])

  const toggle = async () => {
    const audio = audioRef.current
    if (!audio) return

    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      try {
        await audio.play()
        setPlaying(true)
      } catch (error) {
        console.error('Error playing audio:', error)
      }
    }
  }

  return (
    <div className="p-4 bg-card border rounded shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium">{title || 'Audio Track'}</div>
        <button
          onClick={toggle}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
        >
          {playing ? 'Pause' : 'Play'}
        </button>
      </div>
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
        <div
          className="h-2 bg-blue-600 rounded transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
