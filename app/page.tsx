import DashboardClient from "../components/DashboardClient";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="mb-8 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          My Dashboard
        </h1>
        <DashboardClient />
      </div>
    </main>
  );
}
