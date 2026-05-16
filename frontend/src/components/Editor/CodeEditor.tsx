import { useCallback, useRef } from 'react'
import Editor, { OnMount } from '@monaco-editor/react'
import { useTraceStore } from '../../store/traceStore'
import { executeCode } from '../../services/api'
import toast from 'react-hot-toast'
import { LanguageSelector, LANGUAGES } from './LanguageSelector'

export function CodeEditor() {
  const {
    language, setLanguage,
    code, setCode,
    testCase, setTestCase,
    functionName, setFunctionName,
    currentStep, steps,
    setSteps, setLoading, setError,
    setResult, setDataStructuresUsed,
    reset
  } = useTraceStore()

  const editorRef = useRef<any>(null)

  const currentLang = LANGUAGES.find(l => l.id === language)!

  const handleLanguageChange = (lang: 'python' | 'cpp') => {
    setLanguage(lang)
    const newLang = LANGUAGES.find(l => l.id === lang)!
    const prevLang = LANGUAGES.find(l => l.id !== lang)!

    // Swap to the new placeholder if the editor still has the previous placeholder
    // (or is empty) — don't overwrite custom user code
    if (!code.trim() || code === prevLang.placeholder) {
      setCode(newLang.placeholder)
      setTestCase(newLang.testPlaceholder)
      // C++ standalone programs don't need a function name
      if (lang === 'cpp') setFunctionName('')
      else setFunctionName('isValid')
    }
  }

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor

    monaco.editor.defineTheme('dsa-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A737D', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'FF7B72' },
        { token: 'string', foreground: 'A5D6FF' },
        { token: 'number', foreground: '79C0FF' },
        { token: 'type', foreground: 'FFA657' },
      ],
      colors: {
        'editor.background': '#0D1117',
        'editor.foreground': '#C9D1D9',
      }
    })

    monaco.editor.setTheme('dsa-dark')
  }

  // Highlight execution line
  const currentLineNumber = steps[currentStep]?.line_number

  const updateHighlight = useCallback(() => {
    if (!editorRef.current || !currentLineNumber) return

    const editor = editorRef.current
    const decorations = editor.deltaDecorations(
      editor.__prevDecorations || [],
      [{
        range: {
          startLineNumber: currentLineNumber,
          startColumn: 1,
          endLineNumber: currentLineNumber,
          endColumn: 1,
        },
        options: {
          isWholeLine: true,
          className: 'highlighted-line',
        }
      }]
    )
    editor.__prevDecorations = decorations
  }, [currentLineNumber])

  if (editorRef.current && currentLineNumber) {
    updateHighlight()
    editorRef.current.revealLineInCenter(currentLineNumber)
  }

  const handleExecute = async () => {
    reset()
    setLoading(true)
    setError(null)

    try {
      const response = await executeCode({
        code,
        test_case: testCase,
        function_name: functionName,
        language: language, // 🔥 dynamic now
      })

      if (response.success) {
        setSteps(response.steps)
        setResult(response.result)
        setDataStructuresUsed(response.data_structures_used)
        toast.success(
          `Traced ${response.total_steps} steps in ${response.execution_time_ms}ms`
        )
      } else {
        setError(response.error || 'Execution failed')
        setSteps(response.steps)
        toast.error('Execution failed')
      }
    } catch (err: any) {
      setError(err.message || 'Network error')
      toast.error('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      
      {/* Toolbar */}
      <div className="h-12 bg-gray-900 border-b border-gray-800 flex items-center px-4 gap-4">

        {/* Language Selector */}
        <LanguageSelector
          value={language}
          onChange={handleLanguageChange}
        />

        <div className="flex-1" />

        {/* C++ indicator */}
        {language === 'cpp' && (
          <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-1 rounded">
            Compiled
          </span>
        )}

        <button
          onClick={handleExecute}
          className="px-4 py-1.5 bg-green-600 hover:bg-green-500 rounded-md text-sm font-medium flex items-center gap-2"
        >
          {language === 'cpp' ? '🔨 Compile & Visualize' : '▶ Visualize'}
        </button>
      </div>

      {/* Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          language={currentLang.monacoLang}
          value={code}
          onChange={(value) => setCode(value || '')}
          onMount={handleEditorMount}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            automaticLayout: true,
          }}
        />
      </div>

      {/* Inputs */}
      <div className="border-t border-gray-800 p-4 bg-gray-900/50">
        <div className="flex gap-4">

          <div className="flex-1">
            <input
              value={testCase}
              onChange={(e) => setTestCase(e.target.value)}
              placeholder={currentLang.testPlaceholder}
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div className="w-48">
            <input
              value={functionName}
              onChange={(e) => setFunctionName(e.target.value)}
              placeholder="Function name"
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm"
            />
          </div>

        </div>
      </div>

    </div>
  )
}