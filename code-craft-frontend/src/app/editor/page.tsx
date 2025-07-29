"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEditorStore } from "@/stores/editorStore";
import { useAuthStore } from "@/stores/authStore";
import { LazyCodeEditor } from "@/components/lazy/LazyCodeEditor";
import { ExecutionPanel } from "@/components/editor/ExecutionPanel";
import { Button } from "@/components/ui/button";
import { useResponsive } from "@/hooks/useResponsive";
import { SUPPORTED_LANGUAGES, LANGUAGE_TEMPLATES } from "@/lib/constants";
import { motion } from "framer-motion";
import { Save, Share } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function EditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isMobile } = useResponsive();
  const { isAuthenticated } = useAuthStore();
  const { code, language, setCode, setLanguage } = useEditorStore();
  
  const [showExecution, setShowExecution] = useState(!isMobile);
  const [hasUserModifiedCode, setHasUserModifiedCode] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  
  // Initialize from URL params on mount
  useEffect(() => {
    const languageParam = searchParams.get("language");
    const codeParam = searchParams.get("code");
    
    if (languageParam && languageParam !== language) {
      setLanguage(languageParam);
      // Only set template if no code is provided and this is initial load
      if (!codeParam && !code && initialLoad) {
        const template = LANGUAGE_TEMPLATES[languageParam];
        if (template) {
          setCode(template);
        }
      }
    } else if (!code && initialLoad) {
      // Set initial template if no code exists and this is initial load
      const template = LANGUAGE_TEMPLATES[language] || LANGUAGE_TEMPLATES[SUPPORTED_LANGUAGES[0].id];
      if (template) {
        setCode(template);
      }
    }
    
    if (codeParam) {
      setCode(codeParam);
      setHasUserModifiedCode(true);
    }
    
    // Mark initial load as complete
    if (initialLoad) {
      setInitialLoad(false);
    }
  }, [searchParams, code, language, setCode, setLanguage, initialLoad]);
  
  // Update URL when language changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set("language", language);
      window.history.replaceState({}, "", url.toString());
    }
  }, [language]);
  
  // Handle code change with debouncing to reduce re-renders
  const handleCodeChange = React.useCallback((value: string | undefined) => {
    if (value !== undefined && value !== code) {
      setCode(value);
      setHasUserModifiedCode(true);
    }
  }, [code, setCode]);
  
  // Handle language change with execution result clearing
  const handleLanguageChange = React.useCallback((newLanguage: string) => {
    if (newLanguage !== language) {
      setLanguage(newLanguage);
      
      // Only update to new language template if user hasn't modified code or current code is the default template
      const currentTemplate = LANGUAGE_TEMPLATES[language];
      if (!hasUserModifiedCode || code === currentTemplate) {
        const newTemplate = LANGUAGE_TEMPLATES[newLanguage];
        if (newTemplate) {
          setCode(newTemplate);
          setHasUserModifiedCode(false); // Reset since we're setting a new template
        }
      }
    }
  }, [language, code, hasUserModifiedCode, setLanguage, setCode]);
  
  // Toggle execution panel on mobile
  const toggleExecutionPanel = () => {
    setShowExecution(!showExecution);
  };

  // Handle save snippet
  const handleSaveSnippet = React.useCallback(() => {
    if (!isAuthenticated) {
      toast.error("Please sign in to save snippets");
      router.push("/login");
      return;
    }
    
    if (!code.trim()) {
      toast.error("Cannot save empty code");
      return;
    }
    
    // Show immediate feedback
    toast.success("Saving snippet...", { duration: 1000 });
    
    // Navigate to create snippet page with current code and language
    const params = new URLSearchParams({
      language,
      code,
    });
    router.push(`/snippets/create?${params.toString()}`);
  }, [isAuthenticated, code, language, router]);

  // Handle share functionality
  const handleShare = async () => {
    // Only execute on client
    if (typeof window === 'undefined') return;
    
    const shareData = {
      title: `Code snippet in ${language}`,
      text: `Check out this ${language} code snippet`,
      url: window.location.href,
    };

    try {
      if (navigator.share && isMobile) {
        // Use native share on mobile
        await navigator.share(shareData);
      } else {
        // Copy URL to clipboard on desktop
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Link copied to clipboard!");
      }
    } catch (error) {
      // Fallback to copying URL
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Link copied to clipboard!");
      } catch (clipboardError) {
        toast.error("Failed to share");
      }
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex h-12 items-center justify-between border-b bg-card px-4">
        <div className="flex items-center gap-2">
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Select programming language"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          {isMobile && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={toggleExecutionPanel}
            >
              {showExecution ? "Hide Output" : "Show Output"}
            </Button>
          )}
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleSaveSnippet}
          >
            <Save className="mr-1 h-4 w-4" />
            Save
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleShare}
          >
            <Share className="mr-1 h-4 w-4" />
            Share
          </Button>
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Main editor area */}
        <div className={cn(
          "flex-1 overflow-hidden",
          (isMobile && showExecution) && "hidden"
        )}>
          <LazyCodeEditor
            code={code}
            language={language}
            onChange={handleCodeChange}
            height="100%"
            onSave={handleSaveSnippet}
          />
        </div>
        
        {/* Execution panel */}
        {(!isMobile || showExecution) && (
          <motion.div
            className={cn(
              "border-l bg-card",
              isMobile ? "absolute inset-0 z-10" : "w-1/2 desktop:w-2/5"
            )}
            initial={isMobile ? { x: "100%" } : false}
            animate={isMobile ? { x: 0 } : {}}
            transition={{ type: "spring", damping: 25 }}
          >
            <ExecutionPanel
              code={code}
              language={language}
              onSaveSnippet={handleSaveSnippet}
              className="h-full"
            />
            
            {isMobile && (
              <div className="absolute bottom-4 right-4">
                <Button 
                  onClick={toggleExecutionPanel}
                  size="sm"
                >
                  Back to Editor
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
} 