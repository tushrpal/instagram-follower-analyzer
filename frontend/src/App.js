import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Upload } from "./components/Upload";
import { Dashboard } from "./components/Dashboard";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { MenuBar } from "./components/MenuBar";
import { PendingRequests } from "./components/PendingRequests";
import "./App.css";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex flex-col">
        <Header />
        <MenuBar />

        <main className="flex-grow container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Upload />} />
            <Route path="/dashboard/:sessionId" element={<Dashboard />} />
            <Route
              path="/pending-requests/:sessionId"
              element={<PendingRequests />}
            />
          </Routes>
        </main>

        <Footer />
      </div>
    </Router>
  );
}

export default App;
