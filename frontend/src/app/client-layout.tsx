"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/SideBar";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideSidebarRoutes = ["/login", "/signup"];
  const shouldHideSidebar = hideSidebarRoutes.includes(pathname);

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-black">
      {!shouldHideSidebar && <Sidebar />}
      <main className="flex-1  ml-64 p-6 overflow-y-auto">{children}</main>
    </div>
  );
}
