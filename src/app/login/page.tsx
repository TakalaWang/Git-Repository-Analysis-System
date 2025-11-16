"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Shield, Zap, Github, Loader2 } from "lucide-react"

export default function LoginPage() {
  const { user, signInWithGithub, loading } = useAuth()
  const router = useRouter()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user && !loading) {
      router.push("/dashboard")
    }
  }, [user, loading, router])

  const handleSignIn = async () => {
    setIsSigningIn(true)
    setError(null)
    try {
      await signInWithGithub()
    } catch (err) {
      const firebaseError = err as { code?: string; message?: string }
      // Don't spam console when user explicitly closed the popup
      if (firebaseError.code !== "auth/popup-closed-by-user") {
        console.error("Sign in error:", err)
      }

      let errorMessage = "Failed to sign in. Please try again."

      // Handle specific Firebase errors
      if (firebaseError.code === "auth/popup-closed-by-user") {
        errorMessage = "Sign-in cancelled. Please try again."
      } else if (firebaseError.code === "auth/popup-blocked") {
        errorMessage = "Pop-up was blocked by browser. Please enable pop-ups and try again."
      } else if (firebaseError.code === "auth/unauthorized-domain") {
        errorMessage = "This domain is not authorized. Please contact administrator."
      } else if (firebaseError.message) {
        errorMessage = firebaseError.message
      }

      setError(errorMessage)
    } finally {
      setIsSigningIn(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-73px)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <section className="min-h-[calc(100vh-73px)] flex items-center justify-center px-4">
      <div className="w-full max-w-6xl grid md:grid-cols-2 gap-8 items-center">
        {/* Left - Feature List */}
        <div className="space-y-6 mb-8 md:mb-0">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Sign in to unlock
            <br />
            <span className="text-blue-600">powerful features</span>
          </h1>

          <div className="space-y-4">
            {features.map((f, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="mt-1 p-2 bg-blue-50 rounded-lg">{f.icon}</div>
                <div>
                  <h3 className="font-semibold mb-1">{f.title}</h3>
                  <p className="text-gray-600 text-sm">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right - Sign in Card */}
        <Card className="shadow-lg border border-gray-100">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-semibold">Sign in to your account</CardTitle>
            <CardDescription>Use your GitHub account to access all features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="w-full h-12 text-base"
              size="lg"
            >
              {isSigningIn ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <Github className="mr-2 h-5 w-5" />
                  Sign in with GitHub
                </>
              )}
            </Button>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="pt-4 border-t">
              <p className="text-xs text-gray-500 text-center">
                By signing in, you agree to our Terms of Service and Privacy Policy. We only access
                your public profile information.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

const features = [
  {
    icon: <BarChart className="h-5 w-5 text-blue-600" />,
    title: "AI-Powered Repository Analysis",
    desc: "Analyze Git repositories with Google Gemini AI to understand code structure, architecture, and best practices",
  },
  {
    icon: <Shield className="h-5 w-5 text-blue-600" />,
    title: "Complete Project Insights",
    desc: "Automatic detection of languages, frameworks, dependencies, and project timeline with visual charts",
  },
  {
    icon: <Zap className="h-5 w-5 text-blue-600" />,
    title: "Scan History & Management",
    desc: "Access all your analysis results anytime with quota management and real-time progress tracking",
  },
]
