"use client"

import { createContext, useContext, useEffect, useState } from "react"
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth"
import { auth, githubProvider } from "@/lib/firebase-client"

interface AuthContextType {
  user: User | null
  loading: boolean
  signInWithGithub: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGithub: async () => {},
  signOut: async () => {},
})

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
      console.error("Error signing in with GitHub:", error)
      throw error
    }
  }

  const signOut = async () => {
    await firebaseSignOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGithub, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
