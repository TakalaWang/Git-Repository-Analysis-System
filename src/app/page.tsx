"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Github, Sparkles, BarChart } from "lucide-react"

export default function Home() {
  const [repoUrl, setRepoUrl] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement scan functionality
    console.log("Scanning repository:", repoUrl)
  }

  return (
    <div className="min-h-[calc(100vh-73px)] bg-linear-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            AI-Powered Repository Analysis
          </div>

          <h1 className="text-5xl font-bold tracking-tight mb-6">
            Analyze Any Git Repository
            <br />
            <span className="text-blue-600">In Seconds</span>
          </h1>

          <p className="text-xl text-gray-600 mb-10">
            Get instant insights, tech stack analysis, and skill level assessment for any GitHub,
            GitLab, or Bitbucket repository.
          </p>

          {/* Repository Input */}
          <Card className="max-w-2xl mx-auto shadow-lg">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="url"
                    placeholder="Enter Git repository URL (e.g., https://github.com/user/repo)"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    className="pl-10 h-12"
                    required
                  />
                </div>
                <Button type="submit" size="lg" className="h-12 px-8">
                  Analyze
                </Button>
              </form>
              <p className="text-sm text-gray-500 mt-4">
                No sign-in required • Free analysis for public repositories
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card>
            <CardHeader>
              <Github className="h-10 w-10 text-blue-600 mb-2" />
              <CardTitle>Smart Analysis</CardTitle>
              <CardDescription>
                AI-powered insights using Gemini to understand your codebase structure and
                complexity
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <BarChart className="h-10 w-10 text-blue-600 mb-2" />
              <CardTitle>Tech Stack Detection</CardTitle>
              <CardDescription>
                Automatically identify languages, frameworks, and dependencies used in your project
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Sparkles className="h-10 w-10 text-blue-600 mb-2" />
              <CardTitle>Skill Assessment</CardTitle>
              <CardDescription>
                Get detailed complexity ratings and skill level recommendations for developers
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <Card className="max-w-3xl mx-auto bg-blue-50 border-blue-200">
          <CardContent className="pt-6 text-center">
            <h2 className="text-2xl font-bold mb-2">Want to track your analysis history?</h2>
            <p className="text-gray-600 mb-6">
              Sign in with GitHub to access your dashboard and save unlimited scans
            </p>
            <Button size="lg" asChild>
              <a href="/login">
                <Github className="mr-2 h-5 w-5" />
                Sign In with GitHub
              </a>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
