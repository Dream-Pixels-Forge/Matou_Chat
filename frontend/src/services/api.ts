import axios, { type AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';

// Types
export type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface ChatRequest {
  model: string;
  messages: Omit<Message, 'id' | 'timestamp'>[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
}

export interface ChatResponse {
  id: string;
  model: string;
  created: number;
  message: Message;
  done: boolean;
  done_reason?: string;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}

// API Client
class APIClient {
  private client: AxiosInstance;

  constructor(baseURL: string = 'http://localhost:8001/api') {
    this.client = axios.create({
      baseURL,
      timeout: 120000, // 2 minutes
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if exists
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          // Server responded with a status code outside 2xx
          console.error('API Error:', {
            status: error.response.status,
            data: error.response.data,
            headers: error.response.headers,
          });
        } else if (error.request) {
          // No response received
          console.error('No response from server:', error.request);
        } else {
          // Something happened in setting up the request
          console.error('Request error:', error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  // Health Check
  async healthCheck(): Promise<{ status: string; version: string; ollama_connected: boolean }> {
    const response = await this.client.get('/health');
    return response.data;
  }

  // Models
  async getModels(): Promise<{ models: Array<{ name: string; modified_at: string; size: number }> }> {
    const response = await this.client.get('/tags');
    return response.data;
  }

  // Chat
  async chat(chatRequest: ChatRequest): Promise<ChatResponse> {
    const response = await this.client.post('/chat', {
      ...chatRequest,
      stream: false,
    });
    return response.data;
  }

  // Stream Chat
  async *streamChat(chatRequest: ChatRequest): AsyncGenerator<ChatResponse> {
    const response = await this.client.post(
      '/chat',
      { ...chatRequest, stream: true },
      { responseType: 'stream' }
    );

    const reader = response.data.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            yield data;
          } catch (e) {
            console.error('Error parsing stream data:', e);
          }
        }
      }
    }
  }

  // Generate
  async generate(chatRequest: ChatRequest): Promise<ChatResponse> {
    const response = await this.client.post('/generate', {
      ...chatRequest,
      stream: false,
    });
    return response.data;
  }

  // Stream Generate
  async *streamGenerate(chatRequest: ChatRequest): AsyncGenerator<ChatResponse> {
    const response = await this.client.post(
      '/generate',
      { ...chatRequest, stream: true },
      { responseType: 'stream' }
    );

    const reader = response.data.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            yield data;
          } catch (e) {
            console.error('Error parsing stream data:', e);
          }
        }
      }
    }
  }
}

// Create a singleton instance
export const api = new APIClient(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api');

export default api;
