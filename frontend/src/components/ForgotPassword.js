import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Instagram, AlertCircle, CheckCircle } from "lucide-react";
import axios from "axios";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await axios.post("/api/auth/forgot-password", { email });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
            <Instagram className="w-7 h-7 text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-1">Forgot password?</h1>
        <p className="text-gray-500 dark:text-gray-400 text-center text-sm mb-6">
          Enter your email and we'll send you a reset link
        </p>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4 text-sm text-red-700 dark:text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {success ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <CheckCircle className="w-12 h-12 text-green-500" />
            <p className="text-gray-700 dark:text-gray-300 text-center text-sm">
              If an account exists for <strong>{email}</strong>, you'll receive a password reset link shortly.
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-center text-xs mt-1">
              You can request up to 3 reset links per 72 hours.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
          <Link to="/login" className="text-purple-600 hover:text-purple-700 font-medium">← Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
