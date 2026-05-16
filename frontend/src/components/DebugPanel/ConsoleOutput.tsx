// frontend/src/components/DebugPanel/ConsoleOutput.tsx

import { useTraceStore } from '../../store/traceStore'

export function ConsoleOutput() {
  const { steps, currentStep, result, error } = useTraceStore()
  const step = steps[currentStep]

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-2 border-b border-gray-800">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Output
        </h3>
      </div>
      
      <div className="flex-1 p-4 overflow-auto font-mono text-sm">
        {/* stdout */}
        {step?.stdout && (
          <div className="text-gray-300 whitespace-pre-wrap mb-2">
            {step.stdout}
          </div>
        )}
        
        {/* Final result */}
        {result !== null && result !== undefined && currentStep === steps.length - 1 && (
          <div className="mt-2 pt-2 border-t border-gray-800">
            <span className="text-gray-500">Return: </span>
            <span className="text-green-400">
              {JSON.stringify(result)}
            </span>
          </div>
        )}
        
        {/* Error */}
        {error && (
          <div className="text-red-400 mt-2">
            {error}
          </div>
        )}
        
        {!step?.stdout && !result && !error && (
          <span className="text-gray-600">No output</span>
        )}
      </div>
    </div>
  )
}
