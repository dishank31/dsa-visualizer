// frontend/src/components/Controls/PlaybackControls.tsx

import { useEffect, useRef } from 'react'
import { useTraceStore } from '../../store/traceStore'
import { motion } from 'framer-motion'

export function PlaybackControls() {
    const {
        steps, currentStep, isPlaying, playbackSpeed,
        nextStep, prevStep, goToStep,
        setIsPlaying, setPlaybackSpeed,
    } = useTraceStore()

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

    // Auto-play
    useEffect(() => {
        if (isPlaying) {
            intervalRef.current = setInterval(() => {
                nextStep()
            }, playbackSpeed)
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
        }
    }, [isPlaying, playbackSpeed, nextStep])

    // Stop playing when reaching end
    useEffect(() => {
        if (steps.length > 0 && currentStep >= steps.length - 1) {
            setIsPlaying(false)
        }
    }, [currentStep, steps.length, setIsPlaying])

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement) return

            switch (e.key) {
                case 'ArrowRight':
                case 'n':
                    e.preventDefault()
                    nextStep()
                    break
                case 'ArrowLeft':
                case 'p':
                    e.preventDefault()
                    prevStep()
                    break
                case ' ':
                    e.preventDefault()
                    setIsPlaying(!isPlaying)
                    break
                case 'Home':
                    e.preventDefault()
                    goToStep(0)
                    break
                case 'End':
                    e.preventDefault()
                    goToStep(steps.length - 1)
                    break
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isPlaying, nextStep, prevStep, setIsPlaying, goToStep, steps.length])

    if (steps.length === 0) return null

    // Avoid division by zero
    const progress = steps.length > 1
        ? (currentStep / (steps.length - 1)) * 100
        : 0

    return (
        <div className="h-16 bg-gray-900 border-t border-gray-800 px-6 
                    flex items-center gap-6 z-20">

            {/* Navigation Buttons */}
            <div className="flex items-center gap-2">
                {/* First Step */}
                <button
                    onClick={() => goToStep(0)}
                    disabled={currentStep === 0}
                    className="p-2 rounded hover:bg-gray-800 disabled:opacity-30 
                     disabled:cursor-not-allowed transition-colors"
                    title="First step (Home)"
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 
                     010-1.414l5-5a1 1 0 111.414 1.414L11.414 
                     10l4.293 4.293a1 1 0 010 1.414zm-6 0a1 1 0 
                     01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 
                     011.414 1.414L5.414 10l4.293 4.293a1 1 0 
                     010 1.414z"/>
                    </svg>
                </button>

                {/* Previous */}
                <button
                    onClick={prevStep}
                    disabled={currentStep === 0}
                    className="p-2 rounded hover:bg-gray-800 disabled:opacity-30 
                     disabled:cursor-not-allowed transition-colors"
                    title="Previous step (←)"
                >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 
                     3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 
                     010-1.414l4-4a1 1 0 011.414 0z"/>
                    </svg>
                </button>

                {/* Play/Pause */}
                <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="p-2.5 rounded-full bg-blue-600 hover:bg-blue-500 
                     transition-colors shadow-lg shadow-blue-500/20"
                    title="Play/Pause (Space)"
                >
                    {isPlaying ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 
                           0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 
                           0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 
                           0V8a1 1 0 00-1-1z"/>
                        </svg>
                    ) : (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 
                           000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 
                           001.555.832l3-2a1 1 0 000-1.664l-3-2z"/>
                        </svg>
                    )}
                </button>

                {/* Next */}
                <button
                    onClick={nextStep}
                    disabled={currentStep >= steps.length - 1}
                    className="p-2 rounded hover:bg-gray-800 disabled:opacity-30 
                     disabled:cursor-not-allowed transition-colors"
                    title="Next step (→)"
                >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 
                     6.707a1 1 0 011.414-1.414l4 4a1 1 0 
                     010 1.414l-4 4a1 1 0 01-1.414 0z"/>
                    </svg>
                </button>

                {/* Last Step */}
                <button
                    onClick={() => goToStep(steps.length - 1)}
                    disabled={currentStep >= steps.length - 1}
                    className="p-2 rounded hover:bg-gray-800 disabled:opacity-30 
                     disabled:cursor-not-allowed transition-colors"
                    title="Last step (End)"
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10.293 15.707a1 1 0 010-1.414L14.586 10l-4.293-4.293a1 
                     1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 
                     01-1.414 0z"/>
                        <path d="M4.293 15.707a1 1 0 010-1.414L8.586 10 4.293 
                     5.707a1 1 0 011.414-1.414l5 5a1 1 0 010 
                     1.414l-5 5a1 1 0 01-1.414 0z"/>
                    </svg>
                </button>
            </div>

            {/* Progress Bar */}
            <div className="flex-1 flex items-center gap-4">
                <div className="flex-1 relative">
                    {/* Track */}
                    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-blue-500 rounded-full"
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.2 }}
                        />
                    </div>

                    {/* Clickable overlay */}
                    <input
                        type="range"
                        min={0}
                        max={Math.max(steps.length - 1, 0)}
                        value={currentStep}
                        onChange={(e) => goToStep(parseInt(e.target.value))}
                        className="absolute inset-0 w-full h-1.5 opacity-0 cursor-pointer"
                    />
                </div>

                {/* Step counter */}
                <span className="text-sm text-gray-400 font-mono min-w-[100px] 
                        text-right">
                    {currentStep + 1} / {steps.length}
                </span>
            </div>

            {/* Speed Control */}
            <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">Speed:</span>
                <div className="flex gap-1">
                    {[
                        { label: '0.5x', value: 1600 },
                        { label: '1x', value: 800 },
                        { label: '2x', value: 400 },
                        { label: '4x', value: 200 },
                    ].map(({ label, value }) => (
                        <button
                            key={value}
                            onClick={() => setPlaybackSpeed(value)}
                            className={`px-2 py-0.5 rounded text-xs font-medium transition-colors
                         ${playbackSpeed === value
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}