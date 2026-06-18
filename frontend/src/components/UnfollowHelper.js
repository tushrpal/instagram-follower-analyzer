import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { UserMinus, Download, Copy, Check, ExternalLink, AlertCircle } from "lucide-react";
import axios from "axios";
import { formatDistanceToNow } from "date-fns";

export function UnfollowHelper() {
  const { sessionId } = useParams();
  const [candidates, setCandidates] = useState([]);
  const [checked, setChecked] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`/api/analysis/${sessionId}/unfollow-candidates`);
        setCandidates(res.data.candidates || []);
        // Restore checkbox state from localStorage
        const saved = localStorage.getItem(`unfollow-checked-${sessionId}`);
        if (saved) {
          try { setChecked(JSON.parse(saved)); } catch {}
        }
      } catch (err) {
        setError("Failed to load unfollow candidates.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [sessionId]);

  const toggleChecked = (username) => {
    setChecked((prev) => {
      const next = { ...prev, [username]: !prev[username] };
      localStorage.setItem(`unfollow-checked-${sessionId}`, JSON.stringify(next));
      return next;
    });
  };

  const uncheckedCandidates = candidates.filter((c) => !checked[c.username]);
  const checkedCount = candidates.filter((c) => checked[c.username]).length;

  const copyUsernames = async () => {
    const text = uncheckedCandidates.map((c) => c.username).join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportCSV = () => {
    const header = "Username,Profile URL,Following Since\n";
    const rows = candidates.map((c) => {
      const url = c.href || `https://www.instagram.com/${c.username}/`;
      const since = c.followed_at ? new Date(c.followed_at).toLocaleDateString() : "";
      return `"${c.username}","${url}","${since}"`;
    });
    const csv = header + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `unfollow-list-${sessionId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <p className="text-gray-600 dark:text-gray-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Unfollow Helper</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {candidates.length} people you follow who don't follow you back, sorted by oldest-followed-first.
        </p>
      </div>

      {candidates.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
          <UserMinus className="w-14 h-14 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No one-sided follows found.</p>
        </div>
      ) : (
        <>
          {/* Stats + actions bar */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 mb-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span>{candidates.length} total</span>
              {checkedCount > 0 && (
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <Check className="w-4 h-4" /> {checkedCount} done
                </span>
              )}
              <span>{uncheckedCandidates.length} remaining</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={copyUsernames}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied!" : "Copy usernames"}
              </button>
              <button
                onClick={exportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div className="divide-y dark:divide-gray-700">
              {candidates.map((c) => {
                const isDone = checked[c.username];
                const profileUrl = c.href || `https://www.instagram.com/${c.username}/`;
                return (
                  <div
                    key={c.username}
                    className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                      isDone
                        ? "bg-green-50 dark:bg-green-900/10 opacity-60"
                        : "hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={!!isDone}
                      onChange={() => toggleChecked(c.username)}
                      className="w-4 h-4 accent-purple-600 flex-shrink-0 cursor-pointer"
                      title="Mark as unfollowed"
                    />

                    <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-red-400 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">
                        {c.username.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <a
                        href={profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm font-medium text-gray-900 dark:text-gray-200 hover:text-purple-600 dark:hover:text-purple-400"
                      >
                        @{c.username}
                        <ExternalLink className="w-3 h-3 opacity-50" />
                      </a>
                      {c.followed_at && (
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          Following since {formatDistanceToNow(new Date(c.followed_at), { addSuffix: true })}
                        </p>
                      )}
                    </div>

                    {isDone && (
                      <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Done
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
            Check off each user after you unfollow them on Instagram. Progress is saved in your browser.
          </p>
        </>
      )}
    </div>
  );
}
