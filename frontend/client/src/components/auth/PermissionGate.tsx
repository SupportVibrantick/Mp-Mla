import { useAuth } from "@/hooks/useAuth";

interface PermissionGateProps {
  module: string;
  action: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Conditionally render children based on permission.
 * Use inside any page to show/hide Create buttons, Delete buttons, etc.
 *
 * <PermissionGate module="grievances" action="create">
 *   <Button>+ New Grievance</Button>
 * </PermissionGate>
 */
export function PermissionGate({
  module,
  action,
  children,
  fallback = null,
}: PermissionGateProps) {
  const { can } = useAuth();

  if (!can(module, action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
