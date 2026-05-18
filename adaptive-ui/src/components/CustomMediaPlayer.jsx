import React, { useState, useRef, useEffect } from 'react'

const parseVTT = (text) => {
  const lines = text.split(/\r?\n/)
  const cues = []
  let currentCue = null

  const timeToSec = (timeString) => {
    // timeString format: HH:MM:SS.mmm or MM:SS.mmm
    const parts = timeString.replace(',', '.').split(':')
    if (parts.length === 3) {
      return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2])
    } else if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseFloat(parts[1])
    }
    return parseFloat(timeString) || 0
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line.includes('-->')) {
      const [start, end] = line.split('-->').map(s => s.trim())
      currentCue = { start: timeToSec(start), end: timeToSec(end), text: '' }
      cues.push(currentCue)
    } else if (currentCue && line !== '' && !line.match(/^\d+$/) && line !== 'WEBVTT') {
      currentCue.text += (currentCue.text ? '\n' : '') + line
    }
  }
  return cues
}

export default function CustomMediaPlayer({ 
  src, 
  ccSrc = null, 
  type = 'VIDEO', // 'VIDEO' or 'AUDIO'
  mode = 'OPEN', // 'LOCKED', 'WATCHED', 'OPEN'
  onComplete
}) {
  const mediaRef = useRef(null)
  const progressRef = useRef(null)
  
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [maxWatched, setMaxWatched] = useState(0)
  const [completed, setCompleted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)

  // Subtitles
  const [cues, setCues] = useState([])
  const [ccEnabled, setCcEnabled] = useState(false)
  const [currentCaption, setCurrentCaption] = useState('')

  useEffect(() => {
    if (ccSrc) {
      fetch(ccSrc)
        .then(res => res.text())
        .then(text => setCues(parseVTT(text)))
        .catch(err => console.error('Failed to load CC', err))
    }
  }, [ccSrc])

  useEffect(() => {
    const media = mediaRef.current
    if (!media) return

    const updateTime = () => {
      const time = media.currentTime
      setCurrentTime(time)
      
      if (time > maxWatched) {
        setMaxWatched(time)
      }

      // Update CC
      if (ccEnabled && cues.length > 0) {
        const activeCue = cues.find(c => time >= c.start && time <= c.end)
        setCurrentCaption(activeCue ? activeCue.text : '')
      } else {
        setCurrentCaption('')
      }
    }

    const onEnded = () => {
      setPlaying(false)
      setCompleted(true)
      if (onComplete) onComplete()
    }

    media.addEventListener('timeupdate', updateTime)
    media.addEventListener('loadedmetadata', () => setDuration(media.duration))
    media.addEventListener('ended', onEnded)

    return () => {
      media.removeEventListener('timeupdate', updateTime)
      media.removeEventListener('loadedmetadata', () => setDuration(media.duration))
      media.removeEventListener('ended', onEnded)
    }
  }, [maxWatched, ccEnabled, cues, onComplete])

  const togglePlay = () => {
    if (mediaRef.current) {
      if (playing) mediaRef.current.pause()
      else mediaRef.current.play()
      setPlaying(!playing)
    }
  }

  const handleSeek = (e) => {
    if (!mediaRef.current || !progressRef.current) return
    const rect = progressRef.current.getBoundingClientRect()
    const pos = (e.clientX - rect.left) / rect.width
    let targetTime = pos * duration

    if (mode === 'LOCKED') {
      // Cannot seek at all
      return
    } else if (mode === 'WATCHED' && !completed) {
      // Can only seek backwards or up to maxWatched
      if (targetTime > maxWatched) {
        targetTime = maxWatched
      }
    }
    
    mediaRef.current.currentTime = targetTime
    setCurrentTime(targetTime)
  }

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', background: 'var(--bg-input)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
      
      {/* Media Viewport */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: type === 'VIDEO' ? '16/9' : 'auto', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {type === 'VIDEO' ? (
          <video 
            ref={mediaRef} 
            src={src} 
            style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
            onClick={togglePlay}
          />
        ) : (
          <audio ref={mediaRef} src={src} style={{ display: 'none' }} />
        )}

        {type === 'AUDIO' && (
          <div style={{ padding: 60, color: '#fff', fontSize: 48, opacity: 0.5 }}>
            🎵 Audio Resource
          </div>
        )}

        {/* Play Overlay */}
        {!playing && (
          <div 
            onClick={togglePlay}
            style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)', cursor: 'pointer' }}
          >
            <div style={{ width: 64, height: 64, background: 'var(--accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 24, paddingLeft: 4 }}>
              ▶
            </div>
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: 12 }}>
        
        {/* Progress Bar */}
        <div 
          ref={progressRef}
          onClick={handleSeek}
          style={{ 
            height: 8, background: 'var(--border)', borderRadius: 4, cursor: mode === 'LOCKED' ? 'not-allowed' : 'pointer',
            position: 'relative', overflow: 'hidden' 
          }}
        >
          {/* Max Watched Buffer (for WATCHED mode) */}
          {(mode === 'WATCHED' || mode === 'OPEN' || completed) && (
            <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${(maxWatched / duration) * 100}%`, background: 'rgba(255,255,255,0.2)' }} />
          )}
          {/* Current Progress */}
          <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${(currentTime / duration) * 100}%`, background: 'var(--accent)', transition: 'width 0.1s linear' }} />
        </div>

        {/* Buttons & Info */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button onClick={togglePlay} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: 20, cursor: 'pointer', width: 24 }}>
              {playing ? '⏸' : '▶'}
            </button>
            <div style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 600 }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {cues.length > 0 && (
              <button 
                onClick={() => setCcEnabled(!ccEnabled)}
                style={{ 
                  background: ccEnabled ? 'var(--accent)' : 'var(--bg-input)', 
                  color: ccEnabled ? '#fff' : 'var(--text-primary)',
                  border: '1px solid var(--border)', 
                  borderRadius: 4, padding: '4px 8px', fontSize: 12, fontWeight: 700, cursor: 'pointer' 
                }}
              >
                CC
              </button>
            )}
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', background: 'var(--bg-input)', padding: '4px 8px', borderRadius: 4 }}>
              {mode} MODE
            </div>
          </div>

        </div>
      </div>

      {/* Dedicated CC Subtitle Area (Below Video) */}
      {ccEnabled && (
        <div style={{ 
          background: '#1a1a1a', 
          color: '#fff', 
          minHeight: 60,
          padding: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          fontSize: 16,
          fontWeight: 500,
          borderTop: '1px solid var(--border)'
        }}>
          {currentCaption || <span style={{ opacity: 0.3 }}>[ No spoken audio ]</span>}
        </div>
      )}

    </div>
  )
}
