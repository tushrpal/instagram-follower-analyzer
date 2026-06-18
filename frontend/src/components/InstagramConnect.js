import React, { useState, useEffect } from "react";
import { Link2, Link2Off, ExternalLink, AlertCircle, Loader } from "lucide-react";
import axios from "axios";

export function InstagramConnect({ onStatusChange }) {
  const [status, setStatus] = useState(null); // null = loading
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState(null);

  const loadStatus = async () => {
    try {
      const res = await axios.get("/api/instagram/status");
      setStatus(res.data);
      onStatusChange?.(res.data);
    } catch {
      setStatus({ connected: false });
    }
  };

  useEffect(() => {
    loadStatus();
    // Check if returning from OAuth
    const params = new URLSearchParams(window.location.search);
    const igauth = params.get("igauth");
    if (igauth === "success") {
      loadStatus();
      window.history.replaceState({}, "", window.location.pathname);
    } else if (igauth === "denied" || igauth === "error") {
      setError("Instagram connection failed. Make sure you have a Professional (Business/Creator) account.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      const res = await axios.get("/api/instagram/auth-url");
      window.location.href = res.data.url;
    } catch (err) {
      setError(err.response?.data?.error || "Failed to start connection.");
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await axios.delete("/api/instagram/disconnect");
      setStatus({ connected: false });
      onStatusChange?.({ connected: false });
    } catch {
      setError("Failed to disconnect.");
    } finally {
      setDisconnecting(false);
    }
  };

  if (status === null) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          {status.connected
            ? <Link2 className="w-4 h-4 text-green-500" />
            : <Link2Off className="w-4 h-4 text-gray-400" />}
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {status.connected ? `Connected as @${status.username || "unknown"}` : "Connect Instagram Pro Account"}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {status.connected
            ? "Live metrics from the Graph API supplement your ZIP analysis. Follower lists still require the ZIP export."
            : "Optional: connect a Business or Creator account to unlock live audience metrics, demographics, and best time to post."}
        </p>
        {error && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-red-600 dark:text-red-400">
            <AlertCircle className="w-3.5 h-3.5" />{error}
          </div>
        )}
      </div>
      {status.connected ? (
        <button
          onClick={handleDisconnect}
          disabled={disconnecting}
          className="text-xs px-3 py-1.5 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
        >
          {disconnecting ? "Disconnecting…" : "Disconnect"}
        </button>
      ) : (
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="text-xs px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          {connecting ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
          {connecting ? "Redirecting…" : "Connect"}
        </button>
      )}
    </div>
  );
}
