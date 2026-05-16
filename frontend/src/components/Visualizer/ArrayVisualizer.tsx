// frontend/src/components/Visualizer/ArrayVisualizer.tsx

import { motion } from 'framer-motion'

interface ArrayVisualizerProps {
  name: string
  data: any[]
  highlights: (number | string)[]
  operation?: string
  pointers?: Record<string, number>  // e.g., { "i": 2, "j": 5 }
}

export function ArrayVisualizer({
  name, data, highlights, operation, pointers = {}
}: ArrayVisualizerProps) {

  const getItemStyle = (index: number) => {
    if (highlights.includes(index)) {
      return {
        bg: 'bg-yellow-500',
        border: 'border-yellow-400',
        text: 'text-black',
        glow: 'shadow-yellow-500/50 shadow-lg',
      }
    }

    // Check if any pointer points here
    const pointingPointers = Object.entries(pointers)
      .filter(([_, idx]) => idx === index)

    if (pointingPointers.length > 0) {
      return {
        bg: 'bg-blue-500',
        border: 'border-blue-400',
        text: 'text-white',
        glow: 'shadow-blue-500/30 shadow-md',
      }
    }

    return {
      bg: 'bg-gray-800',
      border: 'border-gray-600',
      text: 'text-gray-200',
      glow: '',
    }
  }

  return (
    <div className="flex flex-col items-center">
      {/* Label */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm font-medium text-gray-300">{name}</span>
        <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 
                        rounded-full">
          Array
        </span>
        <span className="text-xs text-gray-500">
          len: {data.length}
        </span>
      </div>

      {/* Array */}
      <div className="flex gap-1 items-end">
        {data.map((item, index) => {
          const style = getItemStyle(index)

          return (
            <div key={index} className="flex flex-col items-center">
              {/* Pointer labels above */}
              {Object.entries(pointers)
                .filter(([_, idx]) => idx === index)
                .map(([pName]) => (
                  <motion.div
                    key={pName}
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-blue-400 font-mono mb-1"
                  >
                    {pName}↓
                  </motion.div>
                ))
              }

              {/* Array cell */}
              <motion.div
                layout
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 25,
                  delay: index * 0.02
                }}
                className={`min-w-[48px] h-12 flex items-center justify-center 
                           border rounded font-mono text-sm font-medium
                           ${style.bg} ${style.border} ${style.text} 
                           ${style.glow} transition-all duration-200`}
              >
                {typeof item === 'string'
                  ? `"${item}"`
                  : JSON.stringify(item)}
              </motion.div>

              {/* Index below */}
              <span className="text-[10px] text-gray-500 mt-1 font-mono">
                {index}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}