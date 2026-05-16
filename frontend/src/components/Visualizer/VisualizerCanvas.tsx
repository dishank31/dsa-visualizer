// frontend/src/components/Visualizer/VisualizerCanvas.tsx

import { useTraceStore } from '../../store/traceStore'
import { StackVisualizer } from './StackVisualizer'
import { ArrayVisualizer } from './ArrayVisualizer'
import { HashMapVisualizer } from './HashMapVisualizer'
import { TreeVisualizer } from './TreeVisualizer'
import { LinkedListVisualizer } from './LinkedListVisualizer'
import { QueueVisualizer } from './QueueVisualizer'
import { motion, AnimatePresence } from 'framer-motion'

export function VisualizerCanvas() {
    const { steps, currentStep, dataStructuresUsed, isLoading } = useTraceStore()

    const step = steps[currentStep]

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent 
                          rounded-full animate-spin" />
                    <p className="text-gray-400">Tracing execution...</p>
                </div>
            </div>
        )
    }

    if (!step) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">🔍</div>
                    <h2 className="text-xl font-semibold text-gray-300 mb-2">
                        Ready to Visualize
                    </h2>
                    <p className="text-gray-500 max-w-md">
                        Paste your code, enter a test case, and click
                        <span className="text-green-400 font-medium"> Visualize </span>
                        to see your algorithm come to life.
                    </p>
                </div>
            </div>
        )
    }

    // Collect all data structure states from current step's variables
    const renderVisualizers = () => {
        const visualizers: JSX.Element[] = []
        const variables = step.variables || {}

        // Scan variables to find data structures
        Object.entries(variables).forEach(([name, value]) => {
            if (Array.isArray(value)) {
                // Determine if it's a stack or array based on operations
                const isStack = steps.some(s =>
                    s.data_structure_id === name &&
                    (s.operation === 'stack_push' || s.operation === 'stack_pop')
                )

                if (isStack) {
                    visualizers.push(
                        <StackVisualizer
                            key={`stack-${name}`}
                            name={name}
                            data={value}
                            highlights={step.data_structure_id === name
                                ? step.highlight_elements : []}
                            operation={step.data_structure_id === name
                                ? step.operation : undefined}
                        />
                    )
                } else {
                    visualizers.push(
                        <ArrayVisualizer
                            key={`array-${name}`}
                            name={name}
                            data={value}
                            highlights={step.data_structure_id === name
                                ? step.highlight_elements : []}
                            operation={step.data_structure_id === name
                                ? step.operation : undefined}
                        />
                    )
                }
            } else if (typeof value === 'object' && value !== null &&
                !Array.isArray(value)) {
                // Could be a hashmap, tree, or linked list
                if ('val' in value && ('left' in value || 'right' in value)) {
                    visualizers.push(
                        <TreeVisualizer
                            key={`tree-${name}`}
                            name={name}
                            data={value}
                        />
                    )
                } else if ('val' in value && 'next' in value) {
                    visualizers.push(
                        <LinkedListVisualizer
                            key={`ll-${name}`}
                            name={name}
                            data={value}
                        />
                    )
                } else {
                    visualizers.push(
                        <HashMapVisualizer
                            key={`map-${name}`}
                            name={name}
                            data={value}
                        />
                    )
                }
            }
        })

        return visualizers
    }

    return (
        <div className="h-full flex flex-col">
            {/* Step Explanation Bar */}
            <div className="px-6 py-3 bg-gray-900/50 border-b border-gray-800">
                <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 
                          rounded text-xs font-mono">
                        Line {step.line_number}
                    </span>
                    <code className="text-sm text-gray-300 font-mono">
                        {step.code_line}
                    </code>
                </div>
                <p className="text-sm text-gray-400 mt-1">{step.explanation}</p>
            </div>

            {/* Visualizers Grid */}
            <div className="flex-1 p-6 overflow-auto">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0.5 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-wrap gap-8 justify-center items-start"
                    >
                        {renderVisualizers()}

                        {renderVisualizers().length === 0 && (
                            <div className="text-gray-500 text-sm">
                                <code className="bg-gray-800 px-3 py-1.5 rounded">
                                    {step.code_line}
                                </code>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    )
}