import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export interface ApiError extends Error {
  status?: number;
  data?: any;
}

export function useApi() {
  const router = useRouter();

  const fetchApi = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${endpoint}`;
    
    // Always include credentials for session-based auth
    const config: RequestInit = {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    };

    try {
      const response = await fetch(url, config);
      
      // Handle 401 Unauthorized globally — but NOT for auth endpoints
      // (a 401 from /auth/login means bad credentials, not session expiry)
      if (response.status === 401 && !endpoint.startsWith('/auth')) {
        router.push('/login');
        throw new Error('Unauthorized');
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const error = new Error(data?.message || data?.error || 'API Request Failed') as ApiError;
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (error) {
      console.error(`API Error on ${endpoint}:`, error);
      throw error;
    }
  }, [router]);

  return { fetchApi };
}
