'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { authApi } from '@/lib/api';
import { API_BASE_URL } from '@/lib/constants';

export function LoginDebug() {
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('password123');
  const [result, setResult] = useState<{
    type: string;
    success: boolean;
    data?: unknown;
    error?: string;
    fullError?: unknown;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      // Test basic connection
      const response = await fetch(`${API_BASE_URL}/health`);
      const data = await response.json();
      setResult({ type: 'connection', success: true, data });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setResult({ type: 'connection', success: false, error: errorMessage });
    }
    
    setLoading(false);
  };

  const testLogin = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await authApi.login(email, password);
      setResult({ type: 'login', success: true, data: response });
    } catch (error) {
      console.error('Login test error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setResult({ type: 'login', success: false, error: errorMessage, fullError: error });
    }
    
    setLoading(false);
  };

  const testRegister = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await authApi.register('Test User', email, password);
      setResult({ type: 'register', success: true, data: response });
    } catch (error) {
      console.error('Register test error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setResult({ type: 'register', success: false, error: errorMessage, fullError: error });
    }
    
    setLoading(false);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Login Debug Panel</CardTitle>
        <p className="text-sm text-muted-foreground">API Base URL: {API_BASE_URL}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              placeholder="test@example.com"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Password</label>
            <Input 
              type="password"
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password123"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={testConnection} disabled={loading}>
            Test Connection
          </Button>
          <Button onClick={testRegister} disabled={loading}>
            Test Register
          </Button>
          <Button onClick={testLogin} disabled={loading}>
            Test Login
          </Button>
        </div>
        
        {loading && <p>Testing...</p>}
        
        {result && (
          <div className="mt-4 p-4 bg-muted rounded">
            <h3 className="font-medium mb-2">
              {result.type} - {result.success ? 'Success' : 'Failed'}
            </h3>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}