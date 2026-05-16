// frontend/src/App.tsx

import { useState } from 'react'
import { Header } from './components/Layout/Header'
import { Footer } from './components/Layout/Footer'
import { CodeEditor } from './components/Editor/CodeEditor'
import { VisualizerCanvas } from './components/Visualizer/VisualizerCanvas'
import { PlaybackControls } from './components/Controls/PlaybackControls'
import { VariableWatch } from './components/DebugPanel/VariableWatch'
import { ConsoleOutput } from './components/DebugPanel/ConsoleOutput'
import { useTraceStore } from './store/traceStore'
import { Toaster } from 'react-hot-toast'
import './App.css'

function App() {
  const { steps, currentStep, error } = useTraceStore()
  const [splitRatio, setSplitRatio] = useState(45)

  return (
    <div className="h-screen w-full flex flex-col bg-[#0D1117] text-gray-200 overflow-hidden">
      <Toaster position="top-right" />
      
      <Header />

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Left Panel - Code Editor */}
        <div 
          className="flex flex-col border-r border-gray-800 bg-[#0D1117]"
          style={{ width: `${splitRatio}%` }}
        >
          <CodeEditor />
        </div>

        {/* Resize Handle */}
        <div 
          className="w-1 bg-gray-800 hover:bg-blue-500 cursor-col-resize 
                     transition-colors z-10"
          onMouseDown={(e) => {
            const startX = e.clientX
            const startRatio = splitRatio
            
            const onMouseMove = (e: MouseEvent) => {
              const delta = e.clientX - startX
              const newRatio = startRatio + (delta / window.innerWidth) * 100
              setSplitRatio(Math.max(20, Math.min(80, newRatio)))
            }
            
            const onMouseUp = () => {
              document.removeEventListener('mousemove', onMouseMove)
              document.removeEventListener('mouseup', onMouseUp)
            }
            
            document.addEventListener('mousemove', onMouseMove)
            document.addEventListener('mouseup', onMouseUp)
          }}
        />

        {/* Right Panel - Visualization */}
        <div className="flex-1 flex flex-col bg-[#0a0c10]">
          
          {/* Visualization Area */}
          <div className="flex-1 overflow-hidden relative">
            <VisualizerCanvas />
            
            {/* Step Overlay */}
            {steps.length > 0 && (
              <div className="absolute top-4 right-4 bg-gray-900/80 backdrop-blur border border-gray-800 rounded-md px-3 py-1.5 text-xs text-gray-400 font-mono z-10">
                Step {currentStep + 1} / {steps.length}
              </div>
            )}
          </div>
          
          {/* Bottom Panel - Debug Info */}
          <div className="h-[30%] border-t border-gray-800 flex bg-gray-900/50">
            <div className="flex-1 border-r border-gray-800 overflow-hidden">
              <VariableWatch />
            </div>
            <div className="w-[30%] min-w-[250px] overflow-hidden">
              <ConsoleOutput />
            </div>
          </div>
        </div>
      </main>

      {/* Playback Controls */}
      <PlaybackControls />
      
      <Footer />
      
      {/* Error Display */}
      {error && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 
                        bg-red-900/90 border border-red-500 rounded-lg 
                        px-6 py-3 max-w-lg z-50 shadow-2xl">
          <p className="text-red-200 text-sm font-mono">{error}</p>
        </div>
      )}
    </div>
  )
}

export default App