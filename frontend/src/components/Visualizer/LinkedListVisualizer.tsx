// frontend/src/components/Visualizer/LinkedListVisualizer.tsx

import { motion } from 'framer-motion'

interface ListNodeData {
    val: any
    next?: ListNodeData | null
}

interface LinkedListVisualizerProps {
    name: string
    data: ListNodeData
    highlightIndex?: number
}

export function LinkedListVisualizer({
    name, data, highlightIndex = -1
}: LinkedListVisualizerProps) {

    // Flatten linked list
    const nodes: any[] = []
    let current: ListNodeData | null | undefined = data
    let index = 0
    const maxNodes = 50  // Safety limit

    while (current && index < maxNodes) {
        nodes.push({ val: current.val, index })
        current = current.next
        index++
    }

    return (
        <div className="flex flex-col items-center">
            <div className="mb-4 flex items-center gap-2">
                <span className="text-sm font-medium text-gray-300">{name}</span>
                <span className="text-xs px-2 py-0.5 bg-cyan-500/20 text-cyan-400 
                        rounded-full">
                    Linked List
                </span>
            </div>

            <div className="flex items-center gap-0">
                {nodes.map((node, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center"
                    >
                        {/* Node */}
                        <div className={`flex items-center border rounded-lg overflow-hidden
                           ${i === highlightIndex
                                ? 'border-yellow-500 shadow-yellow-500/30 shadow-lg'
                                : 'border-gray-600'}`}
                        >
                            {/* Value */}
                            <div className={`px-4 py-2 font-mono text-sm font-medium
                             ${i === highlightIndex
                                    ? 'bg-yellow-500 text-black'
                                    : 'bg-gray-800 text-gray-200'}`}
                            >
                                {node.val}
                            </div>
                            {/* Next pointer indicator */}
                            <div className="px-2 py-2 bg-gray-700 text-gray-400 text-xs">
                                •
                            </div>
                        </div>

                        {/* Arrow to next */}
                        {i < nodes.length - 1 && (
                            <motion.div
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                className="flex items-center px-1"
                            >
                                <div className="w-6 h-0.5 bg-gray-500" />
                                <div className="w-0 h-0 border-t-4 border-b-4 border-l-6 
                              border-t-transparent border-b-transparent 
                              border-l-gray-500" />
                            </motion.div>
                        )}

                        {/* NULL at end */}
                        {i === nodes.length - 1 && (
                            <div className="flex items-center px-1">
                                <div className="w-4 h-0.5 bg-gray-600" />
                                <span className="text-xs text-red-400 font-mono ml-1">
                                    NULL
                                </span>
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>
        </div>
    )
}