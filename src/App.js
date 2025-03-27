import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Register from "./Register";
import Login from "./Login";
import Dashboard from "./dashboard";
import SignDocument from "./SignDocument";
import AdminDashboard from "./AdminDashboard";
import { auth } from "./firebase";

const PrivateRoute = ({ children }) => {
  return auth.currentUser ? children : <Navigate to="/login" />;
};

const App = () => {
  return (
    <Router>
      <div className="header">
        <h1>SecureSign</h1>
      </div>
      <Routes>
        <Route path="/" element={<Navigate replace to="/register" />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/admin-dashboard" element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />
        <Route path="/sign-document" element={<PrivateRoute><SignDocument /></PrivateRoute>} />
      </Routes>
      
    </Router>
  );
};

export default App;
