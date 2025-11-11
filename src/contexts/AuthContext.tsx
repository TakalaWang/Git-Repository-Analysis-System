"use client"

import { createContext, useContext, useEffect, useState } from "react"
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth"
import { auth, githubProvider, db } from "@/lib/firebase-client"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"

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

      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          email: user.email ?? null,
          displayName: user.displayName ?? null,
          photoURL: user.photoURL ?? null,
          provider: "github",
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        },
        { merge: true }
      )

      console.log("Sign in successful and user profile saved.")
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
