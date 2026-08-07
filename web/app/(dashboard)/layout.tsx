import { Sidebar } from "@/components/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "var(--color-bg)" }}>
      <Sidebar />
      <main className="flex-1 overflow-y-auto px-10 py-9">
        <div className="animate-in mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
