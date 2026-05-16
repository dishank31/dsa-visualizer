
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
})

export interface ExecuteRequest {
  code: string
  test_case: string
  function_name?: string
  language?: string
  max_steps?: number
}

export interface ExecuteResponse {
  success: boolean
  error?: string
  steps: any[]
  total_steps: number
  result: any
  data_structures_used: string[]
  execution_time_ms: number
}

export async function executeCode(request: ExecuteRequest): Promise<ExecuteResponse> {
  const response = await api.post<ExecuteResponse>('/api/execute', request)
  return response.data
}

export async function healthCheck(): Promise<boolean> {
  try {
    await api.get('/api/health')
    return true
  } catch {
    return false
  }
}
