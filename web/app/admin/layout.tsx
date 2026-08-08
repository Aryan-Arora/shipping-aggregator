import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminSidebar } from "@/components/AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: seller } = await supabase
    .from("sellers")
    .select("role")
    .eq("auth_user_id", user?.id)
    .single();

  if (seller?.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "var(--color-bg)" }}>
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto px-10 py-9">
        <div className="animate-in mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
