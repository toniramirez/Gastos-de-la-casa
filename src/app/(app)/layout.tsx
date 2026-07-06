import { BottomNav } from "@/components/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-md">
      <main className="px-4 pb-28 pt-5">{children}</main>
      <BottomNav />
    </div>
  );
}
