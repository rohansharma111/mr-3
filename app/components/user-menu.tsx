"use client";

import { signOut, useSession } from "next-auth/react";

export function UserMenu() {
  const { data: session } = useSession();

  const name = session?.user?.name || "User";
  const role = session?.user?.role?.replaceAll("_", " ") || "FIELD MANAGER";

  return (
    <div className="flex items-center gap-3">
      <div className="mr-user-info border-l border-slate-200 pl-4">
        <div className="text-sm font-bold text-slate-900">{name}</div>
        <div className="text-xs text-slate-500">{role}</div>
      </div>
      <button
        type="button"
        onClick={() => signOut({ redirectTo: "/login" })}
        className="mr-signout rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-900"
      >
        Sign out
      </button>
    </div>
  );
}
