"use client";
import BottomNav from "../navigation/BottomNav";

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mobile-safe-page" style={{ minHeight: "100dvh", background: "#fffaf5" }}>
      {children}
      <BottomNav />
    </div>
  );
}