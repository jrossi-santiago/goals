import { TabBar } from "@/components/TabBar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <TabBar />
      <div className="flex-1 pb-16 sm:pb-0">{children}</div>
    </div>
  );
}
