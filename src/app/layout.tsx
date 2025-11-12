import type { Metadata } from "next"
import "./globals.css"
import { AuthProvider } from "@/contexts/AuthContext"
import { Header } from "@/components/Header"
import { Toaster } from "@/components/ui/sonner"

export const metadata: Metadata = {
  title: "Git Repository Analysis System",
  description: "Analyze Git repositories with AI-powered insights",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          <Header />
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
