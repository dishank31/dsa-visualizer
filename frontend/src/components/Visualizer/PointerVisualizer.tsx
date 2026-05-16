// frontend/src/components/Visualizer/PointerVisualizer.tsx
// Shows pointer relationships (unique to C++)

import { motion } from 'framer-motion'

interface PointerVisualizerProps {
  pointers: Record<string, {
    name: string
    pointsTo: string | null   // variable name it points to
    value: any
    address?: string          // memory address (simulated)
  }>
  variables: Record<string, any>
}

export function PointerVisualizer({ pointers, variables }: PointerVisualizerProps) {
  if (Object.keys(pointers).length === 0) return null

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xs text-gray-500 uppercase font-medium">
        Pointers
      </div>
      {Object.entries(pointers).map(([name, ptr]) => (
        <motion.div
          key={name}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-3"
        >
          {/* Pointer box */}
          <div className="bg-purple-900/30 border border-purple-700 
                         rounded px-3 py-2 font-mono text-sm">
            <span className="text-purple-400">*</span>
            <span className="text-gray-200">{name}</span>
          </div>

          {/* Arrow */}
          {ptr.pointsTo && (
            <>
              <div className="flex items-center">
                <div className="w-8 h-0.5 bg-purple-500" />
                <div className="border-l-4 border-t-4 border-b-4 
                               border-t-transparent border-b-transparent 
                               border-l-purple-500 h-0" />
              </div>

              {/* Target variable */}
              <div className="bg-gray-800 border border-gray-600 
                             rounded px-3 py-2 font-mono text-sm">
                <span className="text-gray-400">{ptr.pointsTo}: </span>
                <span className="text-green-400">
                  {JSON.stringify(variables[ptr.pointsTo])}
                </span>
              </div>
            </>
          )}

          {ptr.pointsTo === null && (
            <span className="text-red-400 font-mono text-sm">nullptr</span>
          )}
        </motion.div>
      ))}
    </div>
  )
}