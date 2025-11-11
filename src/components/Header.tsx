"use client"

import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Github, LogOut } from "lucide-react"

export function Header() {
  const { user, signOut, loading } = useAuth()

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Github className="h-6 w-6" />
          <span className="font-semibold text-lg">Git Analyzer</span>
        </Link>

        <nav>
          {loading ? (
            <div className="h-9 w-20 animate-pulse bg-gray-200 rounded-md" />
          ) : user ? (
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  Dashboard
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{user.displayName || user.email}</span>
                <Button variant="outline" size="sm" onClick={() => signOut()} className="gap-2">
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </div>
          ) : (
            <Link href="/login">
              <Button size="sm">Sign In</Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
