// frontend/src/components/Editor/CompileErrorPanel.tsx

import { motion, AnimatePresence } from 'framer-motion'

interface CompileErrorPanelProps {
  error: string | null
  language: 'python' | 'cpp'
}

export function CompileErrorPanel({ error, language }: CompileErrorPanelProps) {
  if (!error) return null

  // Parse error lines
  const errorLines = error.split('\n').filter(Boolean)

  // Try to extract line numbers for highlighting
  const lineErrors = errorLines
    .map(line => {
      const match = line.match(/Line (\d+):\s*(.+)/)
      if (match) {
        return { line: parseInt(match[1]), message: match[2] }
      }
      return null
    })
    .filter(Boolean)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="border-t border-red-800/50 bg-red-950/30 overflow-hidden"
      >
        <div className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-red-400 text-xs font-semibold uppercase">
              {language === 'cpp' ? '🔨 Compile Error' : '❌ Runtime Error'}
            </span>
          </div>

          <div className="space-y-1">
            {errorLines.map((line, i) => (
              <div
                key={i}
                className="font-mono text-xs text-red-300 
                          bg-red-900/20 px-3 py-1.5 rounded"
              >
                {line}
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}