import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import axios from "axios";
import { Upload } from "./components/Upload";
import { Dashboard } from "./components/Dashboard";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { MenuBar } from "./components/MenuBar";
import { PendingRequests } from "./components/PendingRequests";
import { RelationshipLists } from "./components/RelationshipLists";
import { Insights } from "./components/Insights";
import { SessionHistory } from "./components/SessionHistory";
import { Processing } from "./components/Processing";
import { Login } from "./components/Login";
import { Register } from "./components/Register";
import { UnfollowHelper } from "./components/UnfollowHelper";
import { AuthProvider, useAuth } from "./context/AuthContext";
import config from "./config";
import "./App.css";

axios.defaults.withCredentials = true;
if (config.apiUrl) {
  axios.defaults.baseURL = config.apiUrl;
}

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (user === undefined) {
    // Still loading session
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="spinner"></div>
      </div>
    );
  }
  if (user === null) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex flex-col">
          <Header />
          <MenuBar />

          <main className="flex-grow container mx-auto px-4 py-8">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/" element={<Upload />} />
              <Route path="/processing/:sessionId" element={<Processing />} />
              <Route path="/history" element={<ProtectedRoute><SessionHistory /></ProtectedRoute>} />
              <Route path="/dashboard/:sessionId" element={<Dashboard />} />
              <Route path="/unfollow/:sessionId" element={<UnfollowHelper />} />
              <Route path="/pending-requests/:sessionId" element={<PendingRequests />} />
              <Route path="/relationships/:sessionId" element={<RelationshipLists />} />
              <Route path="/insights/:sessionId" element={<Insights />} />
            </Routes>
          </main>

          <Footer />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
