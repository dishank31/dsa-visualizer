// frontend/src/components/Visualizer/StackVisualizer.tsx

import { motion, AnimatePresence } from 'framer-motion'

interface StackVisualizerProps {
  name: string
  data: any[]
  highlights: (number | string)[]
  operation?: string
}

export function StackVisualizer({
  name, data, highlights, operation
}: StackVisualizerProps) {

  const getItemColor = (index: number) => {
    if (highlights.includes(index)) {
      if (operation === 'stack_push') return 'bg-green-500 border-green-400'
      if (operation === 'stack_pop') return 'bg-red-500 border-red-400'
      return 'bg-yellow-500 border-yellow-400'
    }
    return 'bg-gray-700 border-gray-600'
  }

  return (
    <div className="flex flex-col items-center">
      {/* Label */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm font-medium text-gray-300">{name}</span>
        <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 
                        rounded-full">
          Stack
        </span>
        <span className="text-xs text-gray-500">
          size: {data.length}
        </span>
      </div>

      {/* Stack Container */}
      <div className="relative">
        {/* Stack frame */}
        <div className="border-l-2 border-r-2 border-b-2 border-gray-600 
                        rounded-b-lg min-w-[120px] min-h-[60px] 
                        flex flex-col-reverse items-center pb-2 px-1 gap-1">

          <AnimatePresence mode="popLayout">
            {data.map((item, index) => (
              <motion.div
                key={`${index}-${item}`}
                layout
                initial={{
                  opacity: 0,
                  x: operation === 'stack_push' ? 100 : 0,
                  y: operation === 'stack_push' ? -50 : 0,
                  scale: 0.5,
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                  y: 0,
                  scale: 1,
                }}
                exit={{
                  opacity: 0,
                  x: 100,
                  y: -50,
                  scale: 0.5,
                }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 25,
                  duration: 0.4
                }}
                className={`w-full px-4 py-2 rounded border text-center 
                           font-mono text-sm font-medium transition-colors
                           ${getItemColor(index)}`}
              >
                <span className="text-white">{JSON.stringify(item)}</span>

                {/* Index label */}
                <span className="absolute -right-8 text-[10px] text-gray-500">
                  [{index}]
                </span>

                {/* Top indicator */}
                {index === data.length - 1 && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="absolute -left-12 text-xs text-blue-400 
                              font-medium"
                  >
                    TOP →
                  </motion.span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Empty stack indicator */}
          {data.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-gray-500 text-xs py-4"
            >
              empty
            </motion.div>
          )}
        </div>

        {/* Operation indicator */}
        {operation && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-2 text-center text-xs font-medium
                       ${operation === 'stack_push'
                ? 'text-green-400'
                : 'text-red-400'}`}
          >
            {operation === 'stack_push' ? '↑ PUSH' : '↓ POP'}
          </motion.div>
        )}
      </div>
    </div>
  )
}