import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DashboardTabs } from "@/components/layout/dashboard-tabs";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <DashboardHeader />
      <DashboardTabs />
      {children}
    </div>
  );
}
