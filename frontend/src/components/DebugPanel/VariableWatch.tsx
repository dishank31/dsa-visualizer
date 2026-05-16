import { useTraceStore } from '../../store/traceStore'
import { motion, AnimatePresence } from 'framer-motion'

export function VariableWatch() {
    const { steps, currentStep, language } = useTraceStore()
    const step = steps[currentStep]

    if (!step) {
        return (
            <div className="h-full p-4">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                    Variables
                </h3>
                <p className="text-sm text-gray-600">No data yet</p>
            </div>
        )
    }

    const variables = step.variables || {}

    const prevStep = currentStep > 0 ? steps[currentStep - 1] : null
    const prevVars = prevStep?.variables || {}

    const hasChanged = (key: string): boolean => {
        return variables[key] !== prevVars[key]
    }

    const isNew = (key: string): boolean => {
        return !(key in prevVars)
    }

    return (
        <div className="h-full p-4 overflow-auto">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                Variables
            </h3>

            <div className="space-y-1.5">
                <AnimatePresence>
                    {Object.entries(variables).map(([key, value]) => {
                        const typeHint =
                            language === 'cpp'
                                ? getCppTypeHint(key, value)
                                : typeof value

                        return (
                            <motion.div
                                key={key}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{
                                    opacity: 1,
                                    x: 0,
                                    backgroundColor: hasChanged(key)
                                        ? 'rgba(234, 179, 8, 0.1)'
                                        : 'transparent',
                                }}
                                transition={{ duration: 0.3 }}
                                className={`flex items-start gap-2 px-2 py-1.5 rounded text-sm font-mono ${
                                    hasChanged(key)
                                        ? 'ring-1 ring-yellow-500/30'
                                        : ''
                                }`}
                            >
                                {/* Variable Name */}
                                <span className={`font-medium min-w-[60px] ${
                                    isNew(key)
                                        ? 'text-green-400'
                                        : hasChanged(key)
                                        ? 'text-yellow-400'
                                        : 'text-blue-400'
                                }`}>
                                    {key}
                                </span>

                                {/* Type hint */}
                                <span className="text-[10px] text-gray-500">
                                    ({typeHint})
                                </span>

                                <span className="text-gray-500">=</span>

                                {/* Value */}
                                <span className="text-gray-200 break-all">
                                    {language === 'cpp'
                                        ? formatCppValue(value)
                                        : formatPythonValue(value)}
                                </span>

                                {/* Indicators */}
                                {hasChanged(key) && !isNew(key) && (
                                    <span className="text-[10px] text-yellow-500 ml-auto">
                                        changed
                                    </span>
                                )}

                                {isNew(key) && (
                                    <span className="text-[10px] text-green-500 ml-auto">
                                        new
                                    </span>
                                )}
                            </motion.div>
                        )
                    })}
                </AnimatePresence>
            </div>
        </div>
    )
}

/* ---------------- FORMATTERS ---------------- */

function formatPythonValue(value: any): string {
    if (value === null || value === undefined) return 'None'
    if (typeof value === 'string') return `"${value}"`
    if (typeof value === 'boolean') return value ? 'True' : 'False'

    if (Array.isArray(value)) {
        return `[${value
            .slice(0, 10)
            .map(v => formatPythonValue(v))
            .join(', ')}${value.length > 10 ? ', ...' : ''}]`
    }

    if (typeof value === 'object') {
        const entries = Object.entries(value)
        return `{${entries
            .map(([k, v]) => `${k}: ${formatPythonValue(v)}`)
            .join(', ')}}`
    }

    return String(value)
}

function formatCppValue(value: any): string {
    if (value === null || value === undefined) return 'nullptr'
    if (typeof value === 'boolean') return value ? 'true' : 'false'
    if (typeof value === 'string') return `"${value}"`

    if (Array.isArray(value)) {
        return `{${value.slice(0, 10).join(', ')}${
            value.length > 10 ? ', ...' : ''
        }}`
    }

    if (typeof value === 'object') {
        const entries = Object.entries(value)
        return `{${entries
            .map(([k, v]) => `${k}: ${formatCppValue(v)}`)
            .join(', ')}}`
    }

    return String(value)
}

/* ---------------- TYPE DETECTION ---------------- */

function getCppTypeHint(name: string, value: any): string {
    if (Array.isArray(value)) {
        if (value.every(v => typeof v === 'number' && Number.isInteger(v))) {
            return 'vector<int>'
        }
        return 'vector<auto>'
    }

    if (typeof value === 'object' && value !== null) {
        if ('val' in value && 'next' in value) return 'ListNode*'
        if ('val' in value && 'left' in value) return 'TreeNode*'
        return 'map/struct'
    }

    if (typeof value === 'number') {
        return Number.isInteger(value) ? 'int' : 'double'
    }

    if (typeof value === 'string') return 'string'
    if (typeof value === 'boolean') return 'bool'

    return 'auto'
}