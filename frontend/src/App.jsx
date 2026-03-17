import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import CardView from "./pages/CardView";
import AdminLayout from "./components/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Users from "./pages/admin/Users";
import ErrorPage from "./pages/ErrorPage";
import Login from "./components/Login";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/card/:tagId" element={<CardView />} />
      <Route path="/login" element={<Login/>}/>
      <Route path="/admin" element={<AdminLayout />}>
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="users" element={<Users />} />
      </Route>
      <Route path="*" element={<ErrorPage />} />
    </Routes>
  );
}

export default App;
