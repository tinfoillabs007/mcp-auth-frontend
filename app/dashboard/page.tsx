import { DashboardContent } from "@/components/dashboard/dashboard-content";

export default function DashboardPage() {
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-muted-foreground">
        Welcome! From here you can initiate the MCP OAuth flow to access protected resources.
      </p>
      <DashboardContent />
    </section>
  );
} 