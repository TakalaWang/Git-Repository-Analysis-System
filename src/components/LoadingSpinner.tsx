import { Loader2 } from "lucide-react"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  text?: string
}

/**
 * Reusable loading spinner component
 * Can be used throughout the application for consistent loading states
 */
export function LoadingSpinner({ size = "md", text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-muted-foreground`} />
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  )
}

/**
 * Full-page loading component
 * Used for route-level loading states
 */
export function PageLoading({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex min-h-[calc(100vh-73px)] items-center justify-center">
      <LoadingSpinner size="lg" text={text} />
    </div>
  )
}
