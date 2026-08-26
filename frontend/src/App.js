import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import axios from "axios";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { MenuBar } from "./components/MenuBar";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthProvider, useAuth } from "./context/AuthContext";
import config from "./config";
import "./App.css";

// Lazy load route components for code splitting
const Upload = lazy(() => import("./components/Upload").then(m => ({ default: m.Upload })));
const Dashboard = lazy(() => import("./components/Dashboard").then(m => ({ default: m.Dashboard })));
const PendingRequests = lazy(() => import("./components/PendingRequests").then(m => ({ default: m.PendingRequests })));
const RelationshipLists = lazy(() => import("./components/RelationshipLists").then(m => ({ default: m.RelationshipLists })));
const Insights = lazy(() => import("./components/Insights").then(m => ({ default: m.Insights })));
const SessionHistory = lazy(() => import("./components/SessionHistory").then(m => ({ default: m.SessionHistory })));
const Processing = lazy(() => import("./components/Processing").then(m => ({ default: m.Processing })));
const Login = lazy(() => import("./components/Login").then(m => ({ default: m.Login })));
const Register = lazy(() => import("./components/Register").then(m => ({ default: m.Register })));
const ForgotPassword = lazy(() => import("./components/ForgotPassword").then(m => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import("./components/ResetPassword").then(m => ({ default: m.ResetPassword })));
const UnfollowHelper = lazy(() => import("./components/UnfollowHelper").then(m => ({ default: m.UnfollowHelper })));
const Account = lazy(() => import("./components/Account").then(m => ({ default: m.Account })));
const NotFound = lazy(() => import("./components/NotFound").then(m => ({ default: m.NotFound })));

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
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex flex-col">
            <Header />
            <MenuBar />

            <main className="flex-grow container mx-auto px-4 py-8">
              <Suspense fallback={
                <div className="flex items-center justify-center min-h-[50vh]">
                  <div className="spinner"></div>
                </div>
              }>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/" element={<Upload />} />
                  <Route path="/processing/:sessionId" element={<Processing />} />
                  <Route path="/history" element={<ProtectedRoute><SessionHistory /></ProtectedRoute>} />
                  <Route path="/dashboard/:sessionId" element={<Dashboard />} />
                  <Route path="/unfollow/:sessionId" element={<UnfollowHelper />} />
                  <Route path="/pending-requests/:sessionId" element={<PendingRequests />} />
                  <Route path="/relationships/:sessionId" element={<RelationshipLists />} />
                  <Route path="/insights/:sessionId" element={<Insights />} />
                  <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </main>

            <Footer />
          </div>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
