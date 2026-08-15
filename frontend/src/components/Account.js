import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { AlertCircle, Trash2 } from "lucide-react";
import axios from "axios";
import { toast } from "react-hot-toast";

export function Account() {
  const { user, logout } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user]);

  const fetchSessions = async () => {
    try {
      setLoadingSessions(true);
      const { data } = await axios.get("/api/sessions");
      setSessions(data);
    } catch (error) {
      toast.error("Failed to load active sessions.");
      console.error(error);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleRevokeSession = async (sid) => {
    if (!window.confirm("Are you sure you want to revoke this session? This will sign out the selected device.")) return;
    try {
      await axios.delete(`/api/sessions/${sid}`);
      toast.success("Session revoked successfully.");
      fetchSessions(); // Refresh the list
    } catch (error) {
      toast.error("Failed to revoke session.");
      console.error(error);
    }
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await axios.post("/api/auth/delete-account", { password });
      await logout();
      toast.success("Account deleted successfully.");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete account.");
    }
  };

  if (user === undefined) {
    return <div>Loading...</div>; // Or a spinner
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <p className="text-gray-600 dark:text-gray-400">
          You must be logged in to manage your account.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">My Account</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage your account settings and data.</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Account Information</h2>
        <p className="text-gray-700 dark:text-gray-300">
          <strong>Email:</strong> {user.email}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Active Sessions</h2>
        {loadingSessions ? (
          <p>Loading sessions...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="py-3 px-4 font-semibold">Device</th>
                  <th className="py-3 px-4 font-semibold">IP Address</th>
                  <th className="py-3 px-4 font-semibold">Signed In</th>
                  <th className="py-3 px-4 font-semibold">Expires</th>
                  <th className="py-3 px-4 font-semibold"></th>
                </tr>
              </thead>
              <tbody className="text-gray-700 dark:text-gray-300">
                {sessions.map((session) => (
                  <tr key={session.sid} className="border-b dark:border-gray-700">
                    <td className="py-3 px-4 truncate" title={session.userAgent}>{session.userAgent ? `${session.userAgent.substring(0, 40)}...` : 'N/A'}</td>
                    <td className="py-3 px-4">{session.ip}</td>
                    <td className="py-3 px-4">{new Date(session.createdAt).toLocaleString()}</td>
                    <td className="py-3 px-4">{new Date(session.expiresAt).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">
                      {session.isCurrent ? (
                        <span className="font-bold text-green-600 dark:text-green-400 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30">Current</span>
                      ) : (
                        <button
                          onClick={() => handleRevokeSession(session.sid)}
                          className="font-semibold text-red-500 hover:text-red-700"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border-2 border-red-200 dark:border-red-800">
        <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">Danger Zone</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          This action is irreversible. Deleting your account will permanently remove all your saved analysis sessions, notes, and personal information.
        </p>

        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors inline-flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete My Account
          </button>
        ) : (
          <form onSubmit={handleDelete}>
            <p className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
              Enter your password to confirm deletion:
            </p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full max-w-sm px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
              placeholder="Password"
            />
            {error && (
              <div className="my-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}
            <div className="flex items-center gap-4">
              <button
                type="submit"
                className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
              >
                Permanently Delete
              </button>
              <button
                type="button"
                onClick={() => { setConfirming(false); setError(null); setPassword(""); }}
                className="text-gray-600 dark:text-gray-400 hover:underline"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
