import { Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import AdminLayout from "./components/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Users from "./pages/admin/Users";
import CardRegistration from "./pages/admin/CardRegistration";
import ErrorPage from "./pages/ErrorPage";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import CardView from "./pages/cardView/CardView";
import PublicCardView from "./pages/cardView/PublicCardView";
import UserAccessLayout from "./components/UserAccessLayout";
import UserAccessDashboard from "./pages/useraccess/Dashboard";
import Organizations from "./pages/useraccess/Organizations";
import OrganizationDetail from "./pages/useraccess/OrganizationDetail";

function RoleRedirect() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (user.role === "admin") return <Navigate to="/admin/dashboard" replace />;
  if (user.role === "manager")
    return <Navigate to="/manager/dashboard" replace />;
  return <Navigate to="/login" replace />;
}

function App() {
  return (
    <Routes>
      <Route path="*" element={<ErrorPage />} />
      <Route path="/login" element={<Login />} />

      {/* Public card view — NFC scan redirects here */}
      <Route path="/card/:tagId" element={<CardView />} />

      {/* Public read-only card view — accessible without login */}
      <Route path="/view/:tagId" element={<PublicCardView />} />

      {/* Admin routes */}
      <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="card-registration" element={<CardRegistration />} />
          <Route path="organizations" element={<Organizations />} />
          <Route
            path="organizations/:tenantId"
            element={<OrganizationDetail />}
          />
        </Route>
      </Route>

      {/* Manager routes */}
      <Route element={<ProtectedRoute allowedRoles={["manager"]} />}>
        <Route path="/manager" element={<UserAccessLayout />}>
          <Route path="dashboard" element={<UserAccessDashboard />} />
          <Route path="organizations" element={<Organizations />} />
          <Route
            path="organizations/:tenantId"
            element={<OrganizationDetail />}
          />
        </Route>
      </Route>

      {/* Default authenticated route — redirect to role-specific home */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<RoleRedirect />} />
      </Route>
    </Routes>
  );
}

export default App;
