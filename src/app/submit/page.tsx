export default function SubmitPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-foreground">Submit Repository</h1>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl rounded-lg border bg-card p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            Submit a Git Repository for Analysis
          </h2>
          <form className="space-y-4">
            <div>
              <label htmlFor="repo-url" className="block text-sm font-medium text-foreground">
                Repository URL
              </label>
              <input
                type="url"
                id="repo-url"
                placeholder="https://github.com/username/repository"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
            >
              Submit for Analysis
            </button>
          </form>
          <p className="mt-4 text-sm text-muted-foreground">
            Form submission logic pending implementation
          </p>
        </div>
      </main>
    </div>
  );
}
