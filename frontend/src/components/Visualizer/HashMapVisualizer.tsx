// frontend/src/components/Visualizer/HashMapVisualizer.tsx

import { motion, AnimatePresence } from 'framer-motion'

interface HashMapVisualizerProps {
  name: string
  data: Record<string, any>
  highlightKeys?: string[]
}

export function HashMapVisualizer({
  name, data, highlightKeys = []
}: HashMapVisualizerProps) {
  const entries = Object.entries(data)

  return (
    <div className="flex flex-col items-center">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm font-medium text-gray-300">{name}</span>
        <span className="text-xs px-2 py-0.5 bg-orange-500/20 text-orange-400 
                        rounded-full">
          HashMap
        </span>
      </div>

      <div className="bg-gray-800/50 rounded-lg border border-gray-700 
                      overflow-hidden min-w-[200px]">
        {/* Header */}
        <div className="grid grid-cols-2 gap-px bg-gray-700">
          <div className="bg-gray-800 px-4 py-2 text-xs text-gray-400 
                         font-medium uppercase">
            Key
          </div>
          <div className="bg-gray-800 px-4 py-2 text-xs text-gray-400 
                         font-medium uppercase">
            Value
          </div>
        </div>

        {/* Entries */}
        <AnimatePresence>
          {entries.map(([key, value], index) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.05 }}
              className={`grid grid-cols-2 gap-px bg-gray-700
                         ${highlightKeys.includes(key)
                  ? 'ring-2 ring-yellow-500 ring-inset'
                  : ''}`}
            >
              <div className="bg-gray-800/80 px-4 py-2 font-mono text-sm 
                            text-blue-300">
                {JSON.stringify(key)}
              </div>
              <div className="bg-gray-800/80 px-4 py-2 font-mono text-sm 
                            text-green-300">
                {JSON.stringify(value)}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {entries.length === 0 && (
          <div className="px-4 py-4 text-center text-gray-500 text-sm">
            empty
          </div>
        )}
      </div>
    </div>
  )
}