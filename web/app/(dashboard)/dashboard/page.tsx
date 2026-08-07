import { createClient } from "@/lib/supabase/server";

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
        Use the sidebar to add pickup locations, create orders, compare courier rates, and track
        shipments. Stat cards and volume charts land here once real shipment data exists.
      </p>
    </div>
  );
}
