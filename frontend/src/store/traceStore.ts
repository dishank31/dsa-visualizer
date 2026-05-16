import { create } from 'zustand'
import { LANGUAGES } from '../components/Editor/LanguageSelector'

export interface TraceStep {
  step_number: number
  line_number: number
  code_line: string
  operation: string
  data_structure_type: string
  data_structure_id: string
  variables: Record<string, any>
  highlight_elements: (number | string)[]
  explanation: string
  data_structure_state?: any
  operation_details?: Record<string, any>
  stdout?: string
}

interface TraceState {
  // 🔥 Language
  language: 'python' | 'cpp'
  setLanguage: (lang: 'python' | 'cpp') => void

  // Code
  code: string
  testCase: string
  functionName: string

  // Trace data
  steps: TraceStep[]
  currentStep: number

  // UI State
  isLoading: boolean
  isPlaying: boolean
  playbackSpeed: number
  error: string | null
  dataStructuresUsed: string[]
  result: any

  // Actions
  setCode: (code: string) => void
  setTestCase: (tc: string) => void
  setFunctionName: (fn: string) => void
  setSteps: (steps: TraceStep[]) => void
  setCurrentStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  goToStep: (step: number) => void
  setIsPlaying: (playing: boolean) => void
  setPlaybackSpeed: (speed: number) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setResult: (result: any) => void
  setDataStructuresUsed: (ds: string[]) => void
  reset: () => void
}

export const useTraceStore = create<TraceState>((set, get) => ({

  // 🔥 Language
  language: 'python',
  setLanguage: (language) => set({ language }),

  // Initial state
  code: LANGUAGES.find(l => l.id === 'python')?.placeholder || '',

  testCase: '"({[]})"',
  functionName: 'isValid',

  steps: [],
  currentStep: 0,

  isLoading: false,
  isPlaying: false,
  playbackSpeed: 800,
  error: null,
  dataStructuresUsed: [],
  result: null,

  // Actions
  setCode: (code) => set({ code }),
  setTestCase: (testCase) => set({ testCase }),
  setFunctionName: (functionName) => set({ functionName }),

  setSteps: (steps) => set({ steps, currentStep: 0 }),

  setCurrentStep: (step) => set({ currentStep: step }),

  nextStep: () => {
    const { currentStep, steps } = get()
    if (currentStep < steps.length - 1) {
      set({ currentStep: currentStep + 1 })
    } else {
      set({ isPlaying: false })
    }
  },

  prevStep: () => {
    const { currentStep } = get()
    if (currentStep > 0) {
      set({ currentStep: currentStep - 1 })
    }
  },

  goToStep: (step) => {
    const { steps } = get()
    if (step >= 0 && step < steps.length) {
      set({ currentStep: step })
    }
  },

  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setResult: (result) => set({ result }),
  setDataStructuresUsed: (dataStructuresUsed) => set({ dataStructuresUsed }),

  reset: () => set({
    steps: [],
    currentStep: 0,
    isPlaying: false,
    error: null,
    result: null,
    dataStructuresUsed: [],
  }),
}))