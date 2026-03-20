import Sidebar from "@/components/ui/Sidebar";

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar role="owner" />
      {/* Main content — offset by sidebar width (rtl: margin-right) */}
      <main className="mr-60 min-h-screen">
        {children}
      </main>
    </div>
  );
}
