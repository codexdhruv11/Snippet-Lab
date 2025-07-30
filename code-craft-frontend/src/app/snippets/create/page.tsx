"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { snippetApi } from "@/lib/api";
import { SUPPORTED_LANGUAGES } from "@/lib/constants";
import { toast } from "sonner";
import { TagInput } from "@/components/snippet/TagInput";

// Sanitize function to prevent XSS from URL parameters
const sanitizeUrlParam = (param: string | null): string => {
  if (!param) return "";
  // Remove potentially dangerous characters and HTML
  return param
    .replace(/[<>"'&]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim()
    .slice(0, 10000); // Limit length
};


export default function CreateSnippetPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get initial values from URL params with sanitization
  const urlLanguage = sanitizeUrlParam(searchParams.get("language"));
  const initialLanguage = SUPPORTED_LANGUAGES.some(lang => lang.id === urlLanguage) 
    ? urlLanguage 
    : SUPPORTED_LANGUAGES[0].id;
  const initialCode = sanitizeUrlParam(searchParams.get("code")) || "";
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState(initialLanguage);
  const [code, setCode] = useState(initialCode);
  const [tags, setTags] = useState<string[]>([]);
  
  const { mutate: createSnippet, isPending } = useMutation({
    mutationFn: async () => {
      if (!title.trim()) {
        throw new Error("Title is required");
      }
      if (!code.trim()) {
        throw new Error("Code is required");
      }
      
      const result = await snippetApi.createSnippet({
        title: title.trim(),
        description: description.trim(),
        language,
        code,
        tags: tags.length > 0 ? tags : undefined,
      });
      return result;
    },
    onSuccess: (data) => {
      toast.success("Snippet created successfully!");
      // Reset form state
      setTitle("");
      setDescription("");
      setCode("");
      setLanguage(SUPPORTED_LANGUAGES[0].id);
      setTags([]);
      
      // Navigate to the created snippet
      router.push(`/snippets/${data.snippet._id}`);
    },
    onError: (error: unknown) => {
      let errorMessage = "Failed to create snippet";
      const tagErrors: string[] = [];

      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = (error as { response?: { data?: { error?: { details?: Array<{ msg: string }>, message?: string } } } })?.response?.data?.error;
        if (apiError?.details && Array.isArray(apiError.details)) {
          // Handle validation errors
          apiError.details.forEach((detail) => {
            if (detail.msg.includes('Tag')) {
              tagErrors.push(detail.msg);
            }
          });
          errorMessage = apiError.details.map((detail) => detail.msg).join(", ");
        } else if (apiError?.message) {
          errorMessage = apiError.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      if (tagErrors.length > 0) {
        setTags([]); // Clear invalid tags
        toast.error(`Tag errors: ${tagErrors.join(", ")}`);
      } else {
        toast.error(errorMessage);
      }
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createSnippet();
  };
  
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Create New Snippet</h1>
        </div>
        
        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Snippet Details</CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="title" className="mb-2 block text-sm font-medium">
                  Title <span className="text-destructive">*</span>
                </label>
                <Input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter snippet title"
                  maxLength={100}
                  required
                  disabled={isPending}
                  aria-describedby="title-help"
                />
                <div id="title-help" className="text-xs text-muted-foreground mt-1">
                  {100 - title.length} characters remaining
                </div>
              </div>
              
              <div>
                <label htmlFor="description" className="mb-2 block text-sm font-medium">
                  Description
                </label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter snippet description (optional)"
                  rows={3}
                  maxLength={500}
                  disabled={isPending}
                />
              </div>
              
              <div>
                <label htmlFor="language" className="mb-2 block text-sm font-medium">
                  Language <span className="text-destructive">*</span>
                </label>
                <select
                  id="language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={isPending}
                  required
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.id} value={lang.id}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="tags" className="mb-2 block text-sm font-medium">
                  Tags
                </label>
                <TagInput
                  value={tags}
                  onChange={setTags}
                  placeholder="Add tags to help others find your snippet..."
                  disabled={isPending}
                />
              </div>

              <div>
                <label htmlFor="code" className="mb-2 block text-sm font-medium">
                  Code <span className="text-destructive">*</span>
                </label>
                <Textarea
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Paste your code here"
                  rows={12}
                  className="font-mono text-sm"
                  disabled={isPending}
                  required
                />
              </div>
            </CardContent>
            
            <CardFooter className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending || !title.trim() || !code.trim()}
                isLoading={isPending}
                loadingText="Creating..."
              >
                {!isPending && <Save className="mr-2 h-4 w-4" />}
                Create Snippet
              </Button>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
