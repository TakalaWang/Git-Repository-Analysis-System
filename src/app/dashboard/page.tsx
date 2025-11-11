export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <div className="rounded-lg border bg-card p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold text-foreground">Welcome to your Dashboard</h2>
          <p className="text-muted-foreground">
            Dashboard implementation pending - This will display repository analysis results
          </p>
        </div>
      </main>
    </div>
  )
}
