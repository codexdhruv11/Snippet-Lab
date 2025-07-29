"use client";

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Play, Save, CheckCircle2, AlertCircle, Clock, Info, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ExecutionPanelProps } from "@/types/ui";
import { executionApi } from "@/lib/api";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";
import { useEditorStore } from "@/stores/editorStore";
import { useRouter } from "next/navigation";

export function ExecutionPanel({
  language,
  code,
  onSaveSnippet,
  className,
}: ExecutionPanelProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { executionResults, setExecutionResults, clearExecutionResults } = useEditorStore();
  const [isSaving, setIsSaving] = useState(false);
  const [input, setInput] = useState('');
  
  // Use store values
  const { output, status: executionStatus, executionTime } = executionResults;

  const { mutate: executeCode, isPending } = useMutation({
    mutationFn: async () => {
      const response = await executionApi.executeCode(language, code, input);
      return response.execution;
    },
    onSuccess: (data) => {
      const results = {
        output: data.success ? (data.output || '') : (data.error || 'Execution failed'),
        status: data.success ? 'success' as const : 'error' as const,
        executionTime: data.executionTime
      };
      setExecutionResults(results);
    },
    onError: (error: unknown) => {
      // Remove console.error for production
      let errorMessage = 'Failed to execute code. Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'response' in error) {
        const apiError = (error as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error;
        errorMessage = apiError?.message || errorMessage;
      }
      
      setExecutionResults({
        output: errorMessage,
        status: 'error',
        executionTime: null
      });
      
      // Show toast for better UX
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const axiosError = error as { response?: { status?: number; data?: { error?: { isGuest?: boolean } } } };
        if (axiosError.response?.status === 429) {
          const rateLimitMessage = axiosError.response?.data?.error?.isGuest 
            ? 'Guest rate limit exceeded. Please sign in for higher limits.'
            : 'Rate limit exceeded. Please wait a moment before trying again.';
          toast.error(rateLimitMessage);
        } else {
          toast.error(errorMessage);
        }
      } else {
        toast.error(errorMessage);
      }
    },
  });

  const handleExecute = () => {
    if (!code.trim()) {
      setExecutionResults({
        output: 'Error: Please enter some code to execute.',
        status: 'error',
        executionTime: null
      });
      return;
    }

    // Clear previous results and show loading state
    setExecutionResults({
      output: '',
      status: 'idle',
      executionTime: null
    });
    executeCode();
  };

  const handleClearInput = () => {
    setInput('');
  };
  
  // Handle clear output
  const handleClearOutput = () => {
    clearExecutionResults();
    toast.success('Output cleared');
  };

  // Handle save as snippet
  const handleSaveSnippet = () => {
    setIsSaving(true);
    // Implement save logic or navigation to snippet creation form
    if (onSaveSnippet) {
      onSaveSnippet();
    }
    setTimeout(() => setIsSaving(false), 1000);
  };

  return (
    <motion.div
      className={cn("flex h-full flex-col overflow-hidden", className)}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.4 } }
      }}
    >
      <Card className="flex h-full flex-col overflow-hidden border-0 shadow-none">
        <CardHeader className="border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Execution Result</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="execute"
                size="sm"
                onClick={handleExecute}
                disabled={isPending || !code.trim()}
                isLoading={isPending}
                loadingText="Running"
              >
                {!isPending && <Play className="mr-1 h-4 w-4" />}
                Run
              </Button>
              
              {output && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearOutput}
                  title="Clear output"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              
              {executionStatus === 'success' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveSnippet}
                  disabled={isSaving}
                  isLoading={isSaving}
                  loadingText="Saving"
                >
                  {!isSaving && <Save className="mr-1 h-4 w-4" />}
                  Save as Snippet
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        {/* Input Section */}
        <div className="px-4 py-3 border-b bg-muted/20">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="stdin-input" className="text-sm font-medium">
                Input (stdin)
              </label>
              {input && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearInput}
                  className="h-6 px-2 text-xs"
                >
                  Clear
                </Button>
              )}
            </div>
            <Textarea
              id="stdin-input"
              placeholder="Enter input for your program (e.g., numbers, text)..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="min-h-[60px] max-h-[120px] text-sm font-mono resize-none"
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Provide input that your program will read from stdin (e.g., for cin, scanf, input(), etc.)
            </p>
          </div>
        </div>
        
        <CardContent className="flex-1 overflow-auto p-0">
          {isPending ? (
            <Card className="p-4 flex items-center justify-center h-full" aria-busy="true">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p>Executing code...</p>
              </div>
            </Card>
          ) : output ? (
            <Card className="p-4 h-full flex flex-col">
              <div className="flex items-center mb-2">
                {executionStatus === 'success' ? (
                  <CheckCircle2 className="h-5 w-5 text-success mr-2" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-destructive mr-2" />
                )}
                <h3 className={cn(
                  "font-medium",
                  executionStatus === 'success' ? 'text-success' : 'text-destructive'
                )}>
                  {executionStatus === 'success' ? 'Success' : 'Error'}
                </h3>
                
                {executionTime !== null && (
                  <div className="ml-auto flex items-center text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>{executionTime.toFixed(2)}s</span>
                  </div>
                )}
              </div>
              
              <div className="flex-1 bg-muted p-3 rounded-md font-mono text-sm overflow-auto whitespace-pre-wrap">
                {output}
              </div>
            </Card>
          ) : (
            <Card className="p-4 flex items-center justify-center h-full border-dashed">
              <div className="text-center text-muted-foreground">
                <Play className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>Run your code to see the output here</p>
              </div>
            </Card>
          )}
        </CardContent>
        
        <CardFooter className="border-t px-4 py-2">
          <div className="space-y-2">
            <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
              <span>Language: {language}</span>
              <span>Execution timeout: 30s</span>
            </div>
            {!isAuthenticated && (
              <div className="flex items-center gap-2 text-xs text-warning">
                <Info className="h-3 w-3" />
                <span>Guest mode: Limited to 5 executions per minute.</span>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs text-primary"
                  onClick={() => router.push("/login")}
                >
                  Sign in for more
                </Button>
              </div>
            )}
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
} 