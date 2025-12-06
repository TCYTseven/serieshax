"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import ProfileMenu from "./ProfileMenu";

/**
 * Global Profile Menu that appears on all pages when logged in (except landing page)
 */
export default function GlobalProfileMenu() {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  // Don't show on landing page or if not logged in
  if (pathname === "/" || !user || loading) {
    return null;
  }

  return (
    <div className="fixed top-6 left-6 z-50">
      <ProfileMenu />
    </div>
  );
}

