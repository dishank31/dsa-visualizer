// frontend/src/components/Visualizer/QueueVisualizer.tsx

import { motion, AnimatePresence } from 'framer-motion'

interface QueueVisualizerProps {
    name: string
    data: any[]
    highlights: (number | string)[]
    operation?: string
}

export function QueueVisualizer({
    name, data, highlights, operation
}: QueueVisualizerProps) {

    return (
        <div className="flex flex-col items-center">
            <div className="mb-4 flex items-center gap-2">
                <span className="text-sm font-medium text-gray-300">{name}</span>
                <span className="text-xs px-2 py-0.5 bg-pink-500/20 text-pink-400 
                        rounded-full">
                    Queue
                </span>
            </div>

            <div className="flex items-center gap-0">
                {/* FRONT label */}
                <div className="text-xs text-emerald-400 mr-2 font-mono">
                    FRONT →
                </div>

                <div className="flex gap-1">
                    <AnimatePresence mode="popLayout">
                        {data.map((item, index) => (
                            <motion.div
                                key={`${index}-${item}`}
                                layout
                                initial={{
                                    opacity: 0,
                                    x: index === data.length - 1 ? 50 : 0,
                                    scale: 0.5,
                                }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{
                                    opacity: 0,
                                    x: -50,
                                    scale: 0.5
                                }}
                                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                className={`min-w-[48px] h-12 flex items-center justify-center 
                           border rounded font-mono text-sm font-medium
                           ${index === 0 && operation === 'queue_dequeue'
                                        ? 'bg-red-500 border-red-400 text-white'
                                        : index === data.length - 1 &&
                                            operation === 'queue_enqueue'
                                            ? 'bg-green-500 border-green-400 text-white'
                                            : 'bg-gray-800 border-gray-600 text-gray-200'
                                    }`}
                            >
                                {JSON.stringify(item)}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* REAR label */}
                <div className="text-xs text-blue-400 ml-2 font-mono">
                    ← REAR
                </div>
            </div>

            {data.length === 0 && (
                <div className="text-gray-500 text-xs mt-2">empty queue</div>
            )}
        </div>
    )
}