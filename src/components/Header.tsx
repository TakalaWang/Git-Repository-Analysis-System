"use client"

import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Github, LogOut, LayoutDashboard, User } from "lucide-react"
import { useRouter } from "next/navigation"

/**
 * Header component with navigation and user authentication controls.
 * Displays logo, navigation links, and user menu with authentication state management.
 *
 * @returns {JSX.Element} The rendered header component
 */
export function Header() {
  const { user, signOut, loading } = useAuth()
  const router = useRouter()

  /**
   * Handles user sign out and redirects to home page.
   *
   * @returns {Promise<void>}
   */
  const handleSignOut = async () => {
    await signOut()
    router.push("/")
  }

  /**
   * Generates user initials from display name or email for avatar fallback.
   *
   * @returns {string} User initials (up to 2 characters)
   */
  const getUserInitials = () => {
    if (user?.displayName) {
      return user.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    }
    return user?.email?.[0].toUpperCase() || "U"
  }

  return (
    // Use card background for header so it visually separates from the page background
    <header className="border-b bg-card text-foreground sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Github className="h-6 w-6" />
          <span className="font-semibold text-lg">Git Analyzer</span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-2">
          {loading ? (
            // Loading skeleton
            <div className="h-9 w-20 animate-pulse bg-gray-200 rounded-md" />
          ) : user ? (
            // Authenticated user menu
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  Home
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Button>
              </Link>

              {/* User dropdown menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.photoURL || undefined} alt={user.displayName || ""} />
                      <AvatarFallback>{getUserInitials()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user.displayName || "User"}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/dashboard")}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/profile")}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            // Guest user - Home and sign in buttons
            <>
              <Link href="/">
                <Button variant="ghost" size="sm">
                  Home
                </Button>
              </Link>
              <Link href="/login">
                <Button size="sm" className="gap-2">
                  <Github className="h-4 w-4" />
                  Sign In
                </Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
