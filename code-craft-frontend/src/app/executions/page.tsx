"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Check, X, Clock, Code, ExternalLink } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";
import { apiClient } from "@/lib/api";
import { API_ENDPOINTS, SUPPORTED_LANGUAGES } from "@/lib/constants";
import { truncateText } from "@/lib/utils";
import type { Execution, ExecutionsResponse } from "@/types/execution";

export default function ExecutionsPage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [language, setLanguage] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Define query but don't execute it yet
  const executionsQuery = useQuery<ExecutionsResponse>({
    queryKey: ["executions", page, limit, language],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (language) {
        params.append("language", language);
      }
      
      const response = await apiClient.get(`${API_ENDPOINTS.EXECUTIONS.BASE}?${params.toString()}`);
      return response.data;
    },
    enabled: false,
  });

  // Enable query when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      executionsQuery.refetch();
    }
  }, [isAuthenticated, page, limit, language, executionsQuery]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  // Extract data from query
  const data = executionsQuery.data;
  const isLoading = executionsQuery.isLoading;
  const error = executionsQuery.error;

  // Handle language filter change
  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value);
    setPage(1); // Reset to first page when filter changes
  };

  // Handle pagination
  const handleNextPage = () => {
    if (data?.hasMore) {
      setPage((prev) => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (page > 1) {
      setPage((prev) => prev - 1);
    }
  };

  // Handle re-run code
  const handleReRunCode = (execution: Execution) => {
    router.push(`/editor?language=${execution.language}&code=${encodeURIComponent(execution.code)}`);
  };

  // Handle save as snippet
  const handleSaveAsSnippet = (execution: Execution) => {
    router.push(`/editor?language=${execution.language}&code=${encodeURIComponent(execution.code)}&saveAsSnippet=true`);
  };

  const executions = data?.executions || [];
  const totalExecutions = data?.total || 0;

  return (
    <div className="container py-8">
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col tablet:flex-row justify-between items-start tablet:items-center gap-4">
          <div>
            <h1 className="text-heading-2-mobile tablet:text-heading-2-desktop">Execution History</h1>
            <p className="text-muted-foreground">
              View your past code executions and their results
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={language}
              onChange={handleLanguageChange}
              className="rounded-md border border-input bg-background px-3 py-2"
              aria-label="Filter by language"
            >
              <option value="">All Languages</option>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.name}
                </option>
              ))}
            </select>

            <Button 
              variant="outline" 
              onClick={() => router.push("/editor")}
            >
              New Execution
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-10">Loading execution history...</div>
        ) : error ? (
          <div className="text-center py-10 text-destructive">
            Failed to load execution history. Please try again.
          </div>
        ) : executions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-10">
              <p className="text-muted-foreground mb-4">You haven&apos;t executed any code yet.</p>
              <Button onClick={() => router.push("/editor")}>
                Go to Editor
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="text-sm text-muted-foreground mb-4">
              Showing {executions.length} of {totalExecutions} executions
            </div>

            <div className="space-y-4">
              {executions.map((execution) => (
                <Card key={execution._id} className="overflow-hidden">
                  <CardHeader className="flex flex-row items-center justify-between py-4">
                    <CardTitle className="text-base font-medium flex items-center">
                      <Code className="mr-2 h-4 w-4" />
                      {execution.language}
                      <span className="mx-2 text-muted-foreground">•</span>
                      <span className="text-sm font-normal text-muted-foreground">
                        {formatDistanceToNow(new Date(execution.createdAt), { addSuffix: true })}
                      </span>
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      {execution.status === "success" ? (
                        <span className="flex items-center text-success text-sm">
                          <Check className="mr-1 h-4 w-4" />
                          Success
                        </span>
                      ) : (
                        <span className="flex items-center text-destructive text-sm">
                          <X className="mr-1 h-4 w-4" />
                          Failed
                        </span>
                      )}
                      <span className="flex items-center text-sm text-muted-foreground">
                        <Clock className="mr-1 h-4 w-4" />
                        {execution.executionTime}ms
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 tablet:grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-sm font-medium mb-2">Code</h3>
                        <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-[200px]">
                          <code>{truncateText(execution.code, 500)}</code>
                        </pre>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium mb-2">Output</h3>
                        <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-[200px]">
                          <code>{execution.output || execution.error || "No output"}</code>
                        </pre>
                      </div>
                    </div>
                    <div className="flex justify-end mt-4 space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReRunCode(execution)}
                      >
                        <ExternalLink className="mr-1 h-4 w-4" />
                        Re-run
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSaveAsSnippet(execution)}
                      >
                        <Code className="mr-1 h-4 w-4" />
                        Save as Snippet
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-6">
              <Button
                variant="outline"
                onClick={handlePrevPage}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page}
              </span>
              <Button
                variant="outline"
                onClick={handleNextPage}
                disabled={!data?.hasMore}
              >
                Next
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 