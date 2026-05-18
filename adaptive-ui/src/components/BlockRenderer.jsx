import React from 'react'
import CustomMediaPlayer from './CustomMediaPlayer'

export default function BlockRenderer({ blocksJson }) {
  let blocks = []
  try {
    blocks = blocksJson ? JSON.parse(blocksJson) : []
  } catch (e) {
    return <div>Invalid content format</div>
  }

  if (blocks.length === 0) {
    return <div style={{ opacity: 0.5 }}>This section is empty.</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '24px 0', maxWidth: 800, margin: '0 auto' }}>
      {blocks.map(block => {
        switch (block.type) {
          case 'heading':
            const H = `h${block.level || 2}`
            return <H key={block.id} style={{ margin: 0 }}>{block.text}</H>
          
          case 'paragraph':
            return <p key={block.id} style={{ margin: 0, lineHeight: 1.6 }}>{block.text}</p>
          
          case 'image':
            return (
              <div key={block.id} style={{ textAlign: 'center' }}>
                <img src={block.url} alt={block.caption} style={{ maxWidth: '100%', borderRadius: 8 }} />
                {block.caption && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>{block.caption}</div>}
              </div>
            )
          
          case 'video':
            return (
              <div key={block.id}>
                <CustomMediaPlayer src={block.url} ccSrc={block.ccUrl} mode={block.playbackMode || 'OPEN'} type="VIDEO" />
              </div>
            )
          
          case 'alert':
            const colors = {
              info: { bg: '#e0f2fe', border: '#0284c7', text: '#0369a1' },
              warning: { bg: '#fef08a', border: '#ca8a04', text: '#854d0e' },
              danger: { bg: '#fee2e2', border: '#dc2626', text: '#991b1b' }
            }
            const style = colors[block.variant || 'info']
            return (
              <div key={block.id} style={{ background: style.bg, borderLeft: `4px solid ${style.border}`, color: style.text, padding: 16, borderRadius: '0 8px 8px 0' }}>
                {block.text}
              </div>
            )
          
          default:
            return <div key={block.id}>Unsupported block: {block.type}</div>
        }
      })}
    </div>
  )
}
