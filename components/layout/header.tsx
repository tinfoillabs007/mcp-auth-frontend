"use client";

import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from '@/components/ui/skeleton';

export function Header() {
  const { authState, logout } = useAuth();
  const userId = authState.supabaseUserId;
  const isAuthenticated = authState.status === 'authenticated';
  const userInitials = userId ? userId.substring(0, 2).toUpperCase() : "?";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center mx-auto px-4">
        <div className="mr-4 flex items-center">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            {/* Placeholder for a logo/icon */}
            <span className="font-bold sm:inline-block">
              MCP Auth Demo
            </span>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            {/* Add navigation links here */}
            <Link 
              href="/dashboard"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Dashboard
            </Link>
            <Link
              href="/vault"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Vault
            </Link>
            {/* Add RAG link */}
            <Link
              href="/rag"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              RAG Mgmt
            </Link>
            {/* Add Insights link */}
            <Link
              href="/insights"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              AI Insights
            </Link>
            {/* Add Debug link, only visible to authenticated users */}
            {isAuthenticated && (
              <Link
                href="/debug"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                Debug
              </Link>
            )}
             {/* Add more links as needed */}
            {/* <Link href="/client" className="transition-colors hover:text-foreground/80 text-foreground/60">Client</Link> */}
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-4 md:justify-end">
          {/* --- User Status & Logout Button --- */}
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                    {/* Add AvatarImage if you have user image URLs */}
                    {/* <AvatarImage src="/path/to/user-image.png" alt="User Avatar" /> */}
                    <AvatarFallback>{userInitials}</AvatarFallback>
                </Avatar>
                {/* <span className="text-sm text-muted-foreground hidden sm:inline">{userId ? `ID: ${userId.substring(0,6)}...` : 'Loading...'}</span> */} 
                 <Button variant="outline" size="sm" onClick={logout}> 
                    Logout
                </Button>
            </div>
          ) : authState.status === 'loading' ? (
             // Optional: Show loading state
             <Skeleton className="h-8 w-20" />
          ) : (
            // Can add a Login button here if needed, or leave empty if login is elsewhere
            <span className="text-sm text-muted-foreground">Not Logged In</span>
          )}
          {/* --- End User Status & Logout Button --- */}
        </div>
      </div>
    </header>
  );
} 