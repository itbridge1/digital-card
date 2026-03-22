import { Navigate, Outlet, useLocation } from "react-router-dom";

/**
 * ProtectedRoute — guards routes by authentication and optional role.
 * Props:
 *   allowedRoles: string[] (optional) — if provided, only those roles may access
 */
function ProtectedRoute({ allowedRoles }) {
  const location = useLocation();
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate home based on role
    if (user.role === "admin") return <Navigate to="/admin/dashboard" replace />;
    if (user.role === "manager") return <Navigate to="/manager/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;

