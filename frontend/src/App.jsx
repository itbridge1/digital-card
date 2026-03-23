import { Routes, Route } from "react-router-dom";
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
        </Route>
      </Route>

      {/* Manager routes */}
      <Route element={<ProtectedRoute allowedRoles={["manager"]} />}>
        <Route path="/manager" element={<UserAccessLayout />}>
          <Route path="dashboard" element={<UserAccessDashboard />} />
          <Route path="organizations" element={<Organizations />} />
          <Route path="organizations/:tenantId" element={<OrganizationDetail />} />
        </Route>
      </Route>

      {/* Default authenticated route */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Dashboard />} />
      </Route>
    </Routes>
  );
}

export default App;

