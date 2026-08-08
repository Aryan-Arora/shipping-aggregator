import { createClient } from "@/lib/supabase/server";
import { DashboardStats } from "@/components/DashboardStats";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: seller } = await supabase
    .from("sellers")
    .select("company_name")
    .eq("auth_user_id", user?.id)
    .single();

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
        Welcome{seller ? `, ${seller.company_name}` : ""}
      </h1>
      <p className="mt-2 text-[0.9rem] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
        Here's how your shipments are moving right now.
      </p>
      <DashboardStats />
    </div>
  );
}
