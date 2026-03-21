import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import AdminLayout from "./components/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Users from "./pages/admin/Users";
import ErrorPage from "./pages/ErrorPage";
import Register from "./pages/Register";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import CardView from "./pages/cardView/CardView";

function App() {
  return (
    <Routes>
      <Route path="*" element={<ErrorPage />} />

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/card/:tagId" element={<CardView />} />

        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<Users />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
