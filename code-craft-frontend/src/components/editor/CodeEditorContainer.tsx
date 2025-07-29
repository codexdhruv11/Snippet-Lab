"use client";

import React, { useEffect, useState } from "react";
import Editor, { OnMount, loader } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import type { editor } from "monaco-editor";

import { useResponsive } from "@/hooks/useResponsive";
import { useEditorStore } from "@/stores/editorStore";
import { CodeEditorProps } from "@/types/ui";

// Configure Monaco loader with optimizations
let monacoInitialized = false;

function initializeMonaco() {
  if (monacoInitialized || typeof window === 'undefined') return;
  
  monacoInitialized = true;
  
  // Preload Monaco Editor resources
  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = 'https://cdn.jsdelivr.net';
  document.head.appendChild(link);
  
  const dnsLink = document.createElement('link');
  dnsLink.rel = 'dns-prefetch';
  dnsLink.href = 'https://cdn.jsdelivr.net';
  document.head.appendChild(dnsLink);
  
  loader.config({
    paths: {
      vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.43.0/min/vs'
    },
    'vs/nls': {
      availableLanguages: {
        '*': 'en',
      },
    },
  });
  
  // Preload critical Monaco resources
  loader.init().then(() => {
    // Monaco is now ready
  }).catch((error) => {
    console.warn('Monaco Editor failed to initialize:', error);
  });
}

export function CodeEditorContainer({
  code,
  language,
  onChange,
  readOnly = false,
  height = "70vh",
  theme: propTheme,
  options = {},
  onSave,
}: CodeEditorProps & { options?: Record<string, unknown>; onSave?: () => void }) {
  const { resolvedTheme } = useTheme();
  const { isMobile } = useResponsive();
  const { fontSize, wordWrap } = useEditorStore();
  const [mounted, setMounted] = useState(false);

  // Determine editor theme
  const editorTheme = propTheme || 
    (resolvedTheme === "dark" ? "vs-dark" : "vs-light");

  // Configure editor options based on device
  const defaultOptions: editor.IStandaloneEditorConstructionOptions = {
    readOnly,
    minimap: {
      enabled: !isMobile,
    },
    fontSize: isMobile ? fontSize - 2 : fontSize,
    wordWrap: isMobile ? "on" : (wordWrap ? "on" : "off") as editor.IStandaloneEditorConstructionOptions["wordWrap"],
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 2,
    lineNumbers: isMobile ? "off" : "on" as editor.IStandaloneEditorConstructionOptions["lineNumbers"],
  };

  const editorOptions = {
    ...defaultOptions,
    ...options,
  };

  // Handle editor mount
  const handleEditorDidMount: OnMount = (editor, monaco) => {
    setMounted(true);
    
    // Configure editor for touch devices
    if (isMobile) {
      editor.updateOptions({
        fontSize: fontSize - 2,
        lineNumbers: "off",
        folding: false,
        glyphMargin: false,
        lineDecorationsWidth: 10,
      });
    }

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // Prevent default browser save
      event?.preventDefault();
      // Trigger save action with feedback
      if (onSave) {
        onSave();
        // Show visual feedback
        const model = editor.getModel();
        if (model) {
          // Briefly highlight the editor
          const decoration = editor.deltaDecorations([], [{
            range: new monaco.Range(1, 1, model.getLineCount(), 1),
            options: {
              className: 'save-highlight',
              isWholeLine: true,
            }
          }]);
          
          // Remove highlight after 200ms
          setTimeout(() => {
            editor.deltaDecorations(decoration, []);
          }, 200);
        }
      }
    });

    // Set focus if not read-only
    if (!readOnly) {
      editor.focus();
    }

    // Set accessibility attributes
    const editorDomNode = editor.getDomNode();
    if (editorDomNode) {
      editorDomNode.setAttribute('aria-roledescription', 'code editor');
      editorDomNode.setAttribute('aria-label', `${language} code editor`);
    }
  };

  // Set mounted state on mount and initialize Monaco
  useEffect(() => {
    initializeMonaco();
    setMounted(true);
  }, []);

  return (
    <div 
      className="relative h-full w-full rounded-md border overflow-hidden"
      aria-roledescription="code editor"
      aria-label={`${language} code editor`}
    >
      {mounted && (
        <Editor
          height={height}
          language={language}
          value={code}
          theme={editorTheme}
          options={editorOptions}
          onChange={onChange ? (value => onChange(value || "")) : undefined}
          onMount={handleEditorDidMount}
          loading={<div className="flex h-full w-full items-center justify-center">Loading editor...</div>}
          className="rounded-md"
        />
      )}
    </div>
  );
} 