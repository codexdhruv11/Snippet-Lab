"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Code, BookOpen, User, MoreHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  {
    label: 'Editor',
    href: '/editor',
    icon: Code,
  },
  {
    label: 'Snippets',
    href: '/snippets',
    icon: BookOpen,
  },
  {
    label: 'Profile',
    href: '/profile',
    icon: User,
  },
  {
    label: 'More',
    href: '#',
    icon: MoreHorizontal,
  },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="mobile-bottom-nav">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        
        return (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              'flex flex-1 flex-col items-center justify-center py-2',
              isActive ? 'text-primary' : 'text-muted-foreground'
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs mt-1">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
} 