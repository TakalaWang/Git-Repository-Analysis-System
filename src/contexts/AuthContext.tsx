"use client"

import { createContext, useContext, useEffect, useState } from "react"
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth"
import { auth, githubProvider } from "@/lib/firebase-client"

/**
 * Authentication context type definition.
 */
interface AuthContextType {
  /** Current authenticated user or null */
  user: User | null
  /** Loading state during authentication */
  loading: boolean
  /** Sign in with GitHub OAuth */
  signInWithGithub: () => Promise<void>
  /** Sign out current user */
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGithub: async () => {},
  signOut: async () => {},
})

/**
 * Authentication provider component that manages user authentication state.
 * Handles GitHub OAuth sign-in, user session management, and backend synchronization.
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} The authentication provider wrapper
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  /**
   * Initiates GitHub OAuth sign-in flow and syncs user data with backend.
   *
   * @throws {Error} If authentication fails or backend sync fails
   * @returns {Promise<void>}
   */
  const signInWithGithub = async () => {
    try {
      const result = await signInWithPopup(auth, githubProvider)
      const user = result.user

      // Get Firebase ID token to authenticate with backend
      const idToken = await user.getIdToken()

      // Call backend API to sync user data
      const response = await fetch("/api/auth/sync-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          provider: "github",
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        console.error("Failed to sync user data:", error)
        throw new Error(error.error || "Failed to sync user data")
      }

      console.log("Sign in successful and user profile synced via API")
    } catch (error) {
      const firebaseError = error as { code?: string }
      if (firebaseError.code === "auth/popup-closed-by-user") {
        throw error
      }
      console.error("Error signing in with GitHub:", error)
      throw error
    }
  }

  /**
   * Signs out the current user.
   *
   * @returns {Promise<void>}
   */
  const signOut = async () => {
    await firebaseSignOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGithub, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook to access authentication context.
 * Must be used within AuthProvider.
 *
 * @returns {AuthContextType} Authentication context value
 */
export const useAuth = () => useContext(AuthContext)
