import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getInsightsDataset } from "@/lib/insights/queries";
import { InsightsView } from "@/components/insights/insights-view";

interface InsightsPageProps {
  searchParams: Promise<{
    from?: string;
    to?: string;
    member?: string;
    preset?: "4w" | "8w" | "12w" | "custom";
  }>;
}

export const dynamic = "force-dynamic";

export default async function InsightsPage({ searchParams }: InsightsPageProps) {
  const supabase = await createClient();
  if (!supabase) {
    redirect("/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;

  const dataset = await getInsightsDataset({
    from: params.from,
    to: params.to,
    memberId: params.member,
    preset: params.preset,
  });

  if (!dataset) {
    return (
      <div className="p-8 text-center bg-card border border-border rounded-lg max-w-md mx-auto my-12">
        <h2 className="text-base font-semibold text-foreground">Unable to load Insights</h2>
        <p className="text-xs text-muted-foreground mt-1">
          An error occurred while fetching historical analytics. Please try refreshing the page.
        </p>
      </div>
    );
  }

  return <InsightsView dataset={dataset} />;
}
