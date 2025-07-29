"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useAuthStore } from "@/stores/authStore";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MagicBentoGrid } from "@/components/ui/magic-bento";
import TextType from "@/components/ui/TextType";
import { Snippet } from "@/types/api";
import { apiClient } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/constants";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, user, isLoading, isNewUser, clearNewUserFlag } = useAuthStore();
  const [isClient, setIsClient] = useState(false);
  
  // Set client flag on mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Clear new user flag after showing welcome message
  useEffect(() => {
    if (isClient && !isLoading && isNewUser && isAuthenticated) {
      // Clear the flag after a short delay to ensure the user sees the welcome message
      const timer = setTimeout(() => {
        clearNewUserFlag();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isClient, isLoading, isNewUser, isAuthenticated, clearNewUserFlag]);

  // Fetch recent snippets
  const { data: recentSnippets } = useQuery({
    queryKey: ["recentSnippets"],
    queryFn: async () => {
      if (!isAuthenticated) return [];
      const response = await apiClient.get(`${API_ENDPOINTS.SNIPPETS.BASE}?limit=6`);
      return response.data.data as Snippet[];
    },
    enabled: isAuthenticated && isClient,
  });

  // Fetch execution stats
  const { data: executionStats } = useQuery({
    queryKey: ["executionStats"],
    queryFn: async () => {
      if (!isAuthenticated) return null;
      const response = await apiClient.get(API_ENDPOINTS.EXECUTIONS.STATS);
      return response.data;
    },
    enabled: isAuthenticated && isClient,
  });

  // Show loading during hydration or auth initialization
  if (!isClient || isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </main>
    );
  }

  // If not authenticated, show landing page
  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 tablet:p-8 desktop:p-24">
        <div className="z-10 w-full max-w-5xl items-center justify-between">
          <h1 className="mb-4 text-center text-heading-1-mobile tablet:text-heading-1-desktop">
            <TextType
              text="Welcome to SnippetLab"
              typingSpeed={80}
              initialDelay={500}
              loop={false}
              className="welcome-text-type"
              cursorCharacter="|"
              cursorBlinkDuration={0.8}
            />
          </h1>
          
          <p className="mb-8 text-center text-body-large text-muted-foreground">
            A modern code editor with support for multiple languages
          </p>
          
          <MagicBentoGrid 
            columns={{ mobile: 1, tablet: 2, desktop: 3 }} 
            stagger="normal"
          >
            <Card magic hover glow delay={0.1}>
              <CardHeader>
                <CardTitle>Code Editor</CardTitle>
                <CardDescription>Write and execute code in 10+ languages</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button magic glow onClick={() => router.push("/login")} className="w-full">
                  Get Started
                </Button>
              </CardFooter>
            </Card>
            
            <Card magic hover glow delay={0.2}>
              <CardHeader>
                <CardTitle>Snippets</CardTitle>
                <CardDescription>Browse and save code snippets</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button magic variant="outline" onClick={() => router.push("/login")} className="w-full">
                  Explore Snippets
                </Button>
              </CardFooter>
            </Card>
            
            <Card magic hover glow delay={0.3}>
              <CardHeader>
                <CardTitle>Community</CardTitle>
                <CardDescription>Share and discover code with others</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button magic variant="outline" onClick={() => router.push("/register")} className="w-full">
                  Join Now
                </Button>
              </CardFooter>
            </Card>
          </MagicBentoGrid>
        </div>
      </main>
    );
  }

  // Authenticated dashboard
  return (
    <main className="container mx-auto p-4 tablet:p-6 desktop:p-8" id="main-content">
      <div className="grid grid-cols-1 gap-6 desktop:grid-cols-3">
        <div className="desktop:col-span-2">
          <h1 className="mb-6 text-heading-1-mobile tablet:text-heading-1-desktop">
            <TextType
              text={`${isNewUser ? 'Welcome' : 'Welcome back'}, ${user?.name?.split(' ')[0] || 'Coder'}!`}
              typingSpeed={60}
              initialDelay={300}
              loop={false}
              className="welcome-text-type"
              cursorCharacter="|"
              cursorBlinkDuration={1}
            />
          </h1>
          
          <motion.div 
            className="mb-8 flex flex-wrap gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Button magic glow size="lg" onClick={() => router.push("/editor")}>
              New Snippet
            </Button>
            <Button magic variant="outline" size="lg" onClick={() => router.push("/snippets")}>
              Browse Snippets
            </Button>
          </motion.div>
          
          <div className="mb-8">
            <h2 className="mb-4 text-heading-3-mobile tablet:text-heading-3-desktop">
              Recent Snippets
            </h2>
            
            {recentSnippets?.length ? (
              <MagicBentoGrid columns={{ mobile: 1, tablet: 2, desktop: 2 }} stagger="fast">
                {recentSnippets.map((snippet, index) => (
                  <Card key={snippet._id} magic hover glow delay={index * 0.1}>
                    <CardHeader>
                      <CardTitle className="line-clamp-1">{snippet.title}</CardTitle>
                      <CardDescription>
                        {snippet.language} • {new Date(snippet.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <pre className="line-clamp-3 overflow-hidden rounded bg-muted p-2 text-xs">
                        <code>{snippet.code.slice(0, 150)}...</code>
                      </pre>
                    </CardContent>
                    <CardFooter>
                      <Button variant="outline" size="sm" asChild className="w-full">
                        <Link href={`/snippets/${snippet._id}`}>View Snippet</Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </MagicBentoGrid>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>No snippets yet</CardTitle>
                  <CardDescription>
                    Create your first code snippet to get started
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button onClick={() => router.push("/editor")}>
                    Create Snippet
                  </Button>
                </CardFooter>
              </Card>
            )}
          </div>
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card magic hover>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Snippets:</span>
                <span className="font-medium">{recentSnippets?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Executions:</span>
                <span className="font-medium">{executionStats?.total || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Success Rate:</span>
                <span className="font-medium">
                  {executionStats?.successRate ? `${executionStats.successRate}%` : 'N/A'}
                </span>
              </div>
            </CardContent>
          </Card>
          
          {/* Quick Actions */}
          <Card magic hover>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button magic variant="outline" className="w-full justify-start" onClick={() => router.push("/editor")}>
                Create New Snippet
              </Button>
              <Button magic variant="outline" className="w-full justify-start" onClick={() => router.push("/snippets")}>
                Browse All Snippets
              </Button>
              <Button magic variant="outline" className="w-full justify-start" onClick={() => router.push("/snippets/starred")}>
                View Starred
              </Button>
              <Button magic variant="outline" className="w-full justify-start" onClick={() => router.push("/executions")}>
                Execution History
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}