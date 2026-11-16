import { type Session } from "next-auth";

import { hasProjectAccess } from "@/src/features/rbac/utils/checkProjectAccess";

/** canManageSessionView reports whether the user created the view or may update its project. */
export function canManageSessionView({
  session,
  projectId,
  createdBy,
}: {
  session: Session | null;
  projectId: string;
  createdBy: string | null;
}) {
  if (!session?.user) return false;
  if (createdBy === session.user.id) return true;
  return hasProjectAccess({ session, projectId, scope: "project:update" });
}
