import { useState } from 'react'
import { levaStore, Leva, useControls } from 'leva'
import OrbScene from './components/OrbScene'
import config from '../ai-orb-config.json'
import './index.css'

export default function App() {
  const [visibility, setVisibility] = useState(1.0)
  const [state, setState] = useState('idle') // idle | loading | complete

  const cycleState = () => {
    if (state === 'idle') {
      setState('loading')
      setVisibility(1.0)
    } else if (state === 'loading') {
      setState('complete')
      setVisibility(0.0)
    } else {
      setState('idle')
      setVisibility(1.0)
    }
  }

  const exportConfig = async () => {
    try {
      const paths = levaStore.getVisiblePaths()
      const cleanData = {}
      
      paths.forEach(path => {
        const val = levaStore.get(path)
        if (typeof val !== 'function' && val !== undefined) {
          cleanData[path] = val
        }
      })

      const jsonString = JSON.stringify(cleanData, null, 2)
      
      // Try to save actively to disk using the local Vite plugin
      try {
        const res = await fetch('/api/save-config', {
          method: 'POST',
          body: jsonString,
          headers: { 'Content-Type': 'application/json' }
        })
        
        if (res.ok) {
          console.log('Config successfully overwritten to ai-orb-config.json on disk!')
          return
        }
      } catch (e) {
        // Safe fallback if not in the local Vite dev environment
      }

      // 1. Bulletproof clipboard copy fallback
      try {
        const textArea = document.createElement("textarea")
        textArea.value = jsonString
        textArea.style.position = "fixed"
        textArea.style.left = "-999999px"
        textArea.style.top = "-999999px"
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        
        const successful = document.execCommand('copy')
        if (!successful) {
          prompt('Press Cmd+C / Ctrl+C to copy your JSON config:', jsonString)
        }
        document.body.removeChild(textArea)
      } catch (e) {
        console.error('Clipboard fallback failed', e)
        prompt('Press Cmd+C / Ctrl+C to copy your JSON config:', jsonString)
      }

      // 2. Fallback to file download
      const blob = new Blob([jsonString], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'ai-orb-config.json'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Delay revocation just in case Safari needs extra time
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) {
      console.error('Failed to export config:', err)
      alert('Failed to export configuration. Check console for details.')
    }
  }

  const { canvasWidth, canvasHeight, isFullScreen, margin } = useControls('Canvas Dimensions', {
    isFullScreen: { value: config['Canvas Dimensions.isFullScreen'] ?? true },
    canvasWidth: { value: 512, min: 64, max: 2048, step: 1, render: (get) => !get('Canvas Dimensions.isFullScreen') },
    canvasHeight: { value: 512, min: 64, max: 2048, step: 1, render: (get) => !get('Canvas Dimensions.isFullScreen') },
    margin: { value: config['Canvas Dimensions.margin'] ?? 64, min: 0, max: 256, step: 1 },
  })

  const containerStyle = isFullScreen ? {
    width: '100vw',
    height: '100vh',
    backgroundColor: 'transparent' // Let canvas handle background
  } : {
    width: `${canvasWidth}px`,
    height: `${canvasHeight}px`,
    borderRadius: '12px',
    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
    border: '1px solid rgba(255,255,255,0.1)',
    overflow: 'hidden',
    backgroundColor: 'transparent'
  }

  return (
    <div className="app">
      <Leva 
        theme={{
          sizes: {
            controlPanelWidth: '450px',
          },
        }}
      />
      {/* WebGL Canvas */}
      <div className="canvas-container" style={containerStyle}>
        <OrbScene visibility={visibility} margin={margin} />
      </div>

      {/* Overlay UI */}
      <div className="overlay">
        <h1 className="title">
          <span className="title-accent">AI</span> Orb
        </h1>
        <p className="subtitle">Entropic Neural Interface</p>

        <div className="controls">
          <button
            className="btn"
            onClick={cycleState}
          >
            {state === 'idle' && '▶ Activate'}
            {state === 'loading' && '⏹ Complete'}
            {state === 'complete' && '↺ Reset'}
          </button>
          
          <button className="btn btn-secondary" onClick={exportConfig}>
            ⤓ Save to Disk
          </button>

          <span className="state-badge" data-state={state}>
            {state.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  )
}
