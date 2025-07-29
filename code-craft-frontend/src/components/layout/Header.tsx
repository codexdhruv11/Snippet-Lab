"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, X, Sun, Moon, Code, Search, ChevronDown, Users, Bell } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { useResponsive } from "@/hooks/useResponsive";
import { SearchModal } from "@/components/search/SearchModal";
import { UserSearchModal } from "@/components/user/UserSearchModal";
import { NotificationDropdown } from "@/components/notification/NotificationDropdown";
import { useUnreadCount } from '@/hooks/useNotifications';
import { UnreadCountResponse } from '@/types/api';
import { ClientOnly } from "@/components/ui/client-only";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Notification Bell Component
function NotificationBell() {
  const { data: unreadData } = useUnreadCount();
  const unreadCount = (unreadData as UnreadCountResponse)?.count || 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="p-0">
        <NotificationDropdown />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Header() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { isSidebarOpen, setSidebarOpen } = useUIStore();
  const { isMobile, isTablet } = useResponsive();
  const [mounted, setMounted] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUserSearchOpen, setIsUserSearchOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);
  
  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  // Prevent hydration mismatch for theme
  useEffect(() => {
    setMounted(true);
  }, []);

  // Keyboard shortcut for search (Ctrl/Cmd + K)
  useEffect(() => {
    if (!mounted) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mounted]);

  return (
    <div className="flex h-16 items-center justify-between px-4 tablet:px-6">
      <div className="flex items-center">
        {/* Mobile/Tablet Menu Toggle */}
        <ClientOnly>
          {mounted && (isMobile || isTablet) && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
              className="mr-2"
            >
              {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          )}
        </ClientOnly>
        
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <Code className="h-6 w-6 text-primary" />
          <span className="hidden font-bold tablet:inline-block">SnippetLab</span>
        </Link>
      </div>
      
      <div className="flex items-center space-x-1 tablet:space-x-4">
        {/* Search Button */}
        <Button 
          variant="ghost" 
          size="icon" 
          aria-label="Search snippets (Ctrl+K)" 
          className="flex"
          onClick={() => setIsSearchOpen(true)}
          title="Search snippets (Ctrl+K)"
        >
          <Search className="h-5 w-5" />
        </Button>
        
        {/* User Search Button - Only show when authenticated */}
        {isAuthenticated && (
          <Button 
            variant="ghost" 
            size="icon" 
            aria-label="Search users" 
            className="flex"
            onClick={() => setIsUserSearchOpen(true)}
            title="Search users"
          >
            <Users className="h-5 w-5" />
          </Button>
        )}
        
        {/* Notification Button - Only show when authenticated */}
        {isAuthenticated && (
          <NotificationBell />
        )}
        
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          {!mounted ? (
            <div className="h-5 w-5" />
          ) : theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>
        
        {/* User Menu */}
        {isAuthenticated ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2">
                <span className="hidden tablet:inline-block">{user?.name}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/profile")}>
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/discover")}>
                Discover Users
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/snippets")}>
                My Snippets
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/executions")}>
                Execution History
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center space-x-2">
            <Button variant="ghost" onClick={() => router.push("/login")}>
              Login
            </Button>
            <Button onClick={() => router.push("/register")}>
              Sign Up
            </Button>
          </div>
        )}
      </div>
      
      {/* Search Modal */}
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      
      {/* User Search Modal */}
      <UserSearchModal isOpen={isUserSearchOpen} onClose={() => setIsUserSearchOpen(false)} />
    </div>
  );
}
