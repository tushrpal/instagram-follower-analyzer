import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowRight, TrendingUp, TrendingDown, ChevronUp, ChevronDown, Pencil, Check, X, ExternalLink } from "lucide-react";
import axios from "axios";

export function SessionHistory() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [compareA, setCompareA] = useState(null);
  const [compareB, setCompareB] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get("/api/analysis");
        setSessions(res.data.sessions || []);
      } catch (err) {
        setError("Failed to load session history");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const runComparison = async () => {
    if (!compareA || !compareB || compareA === compareB) return;
    setComparing(true);
    setComparison(null);
    try {
      const res = await axios.get("/api/analysis/compare", {
        params: { a: compareA, b: compareB },
      });
      setComparison(res.data);
    } catch (err) {
      console.error("Comparison failed:", err);
    } finally {
      setComparing(false);
    }
  };

  const handleRename = async (sessionId, newName) => {
    try {
      await axios.patch(`/api/analysis/${sessionId}/name`, { name: newName });
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, name: newName } : s))
      );
    } catch (err) {
      console.error("Rename failed:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading session history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Session History</h1>
        <p className="text-gray-600 dark:text-gray-400">{sessions.length} analysis sessions</p>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">No analysis sessions yet.</p>
          <Link to="/" className="text-purple-600 hover:text-purple-700 font-medium">
            Upload your first Instagram export
          </Link>
        </div>
      ) : (
        <>
          {/* Session Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden mb-8">
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
                  <tr>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                    <th className="hidden sm:table-cell px-3 sm:px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Followers</th>
                    <th className="hidden sm:table-cell px-3 sm:px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Following</th>
                    <th className="px-3 sm:px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Mutual</th>
                    <th className="hidden md:table-cell px-3 sm:px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Compare</th>
                    <th className="px-3 sm:px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {sessions.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-3 sm:px-4 py-3 text-gray-900 dark:text-gray-200 whitespace-nowrap">
                        {new Date(s.processedAt || s.createdAt).toLocaleDateString(undefined, {
                          year: "numeric", month: "short", day: "numeric",
                        })}
                        <span className="hidden sm:inline">
                          {", "}
                          {new Date(s.processedAt || s.createdAt).toLocaleTimeString(undefined, {
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-3">
                        <InlineNameEditor
                          sessionId={s.id}
                          name={s.name}
                          onSave={handleRename}
                        />
                      </td>
                      <td className="hidden sm:table-cell px-3 sm:px-4 py-3 text-center font-medium dark:text-gray-200">{s.followersCount}</td>
                      <td className="hidden sm:table-cell px-3 sm:px-4 py-3 text-center font-medium dark:text-gray-200">{s.followingCount}</td>
                      <td className="px-3 sm:px-4 py-3 text-center font-medium dark:text-gray-200">{s.mutualCount}</td>
                      <td className="hidden md:table-cell px-3 sm:px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
                            <input
                              type="radio"
                              name="compareA"
                              checked={compareA === s.id}
                              onChange={() => setCompareA(s.id)}
                              className="accent-purple-600"
                            /> A
                          </label>
                          <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
                            <input
                              type="radio"
                              name="compareB"
                              checked={compareB === s.id}
                              onChange={() => setCompareB(s.id)}
                              className="accent-purple-600"
                            /> B
                          </label>
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-center">
                        <Link
                          to={`/dashboard/${s.id}`}
                          className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Compare Button */}
          {compareA && compareB && compareA !== compareB && (
            <div className="text-center mb-8">
              <button
                onClick={runComparison}
                disabled={comparing}
                className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {comparing ? "Comparing..." : "Compare Selected Sessions"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          )}

          {/* Comparison Results */}
          {comparison && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 text-center">Comparison Results</h2>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Session A</p>
                  {comparison.sessionA.name && (
                    <p className="text-sm font-semibold text-purple-600 mb-1">{comparison.sessionA.name}</p>
                  )}
                  <p className="text-sm font-medium dark:text-gray-200">{new Date(comparison.sessionA.createdAt).toLocaleDateString()}</p>
                  <p className="text-lg font-bold text-purple-600">{comparison.sessionA.followersCount} followers</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Session B</p>
                  {comparison.sessionB.name && (
                    <p className="text-sm font-semibold text-purple-600 mb-1">{comparison.sessionB.name}</p>
                  )}
                  <p className="text-sm font-medium dark:text-gray-200">{new Date(comparison.sessionB.createdAt).toLocaleDateString()}</p>
                  <p className="text-lg font-bold text-purple-600">{comparison.sessionB.followersCount} followers</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <DiffCard label="New Followers" count={comparison.summary.newFollowersCount} positive />
                <DiffCard label="Lost Followers" count={comparison.summary.lostFollowersCount} positive={false} />
                <DiffCard label="New Following" count={comparison.summary.newFollowingCount} positive />
                <DiffCard label="Stopped Following" count={comparison.summary.removedFollowingCount} positive={false} />
              </div>

              <div className="space-y-4">
                <UserDiffList title="New Followers" users={comparison.diff.newFollowers} color="green" />
                <UserDiffList title="Lost Followers" users={comparison.diff.lostFollowers} color="red" />
                <UserDiffList title="New Following" users={comparison.diff.newFollowing} color="green" />
                <UserDiffList title="Stopped Following" users={comparison.diff.removedFollowing} color="red" />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function InlineNameEditor({ sessionId, name, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name || "");

  const commit = () => {
    onSave(sessionId, draft.trim());
    setEditing(false);
  };

  const cancel = () => {
    setDraft(name || "");
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") cancel(); }}
          className="text-sm border rounded px-2 py-0.5 w-36 focus:outline-none focus:ring-1 focus:ring-purple-400 dark:bg-gray-700 dark:border-gray-500 dark:text-white"
          placeholder="Add a name..."
          maxLength={120}
        />
        <button onClick={commit} className="text-green-600 hover:text-green-700"><Check className="w-3.5 h-3.5" /></button>
        <button onClick={cancel} className="text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>
      </div>
    );
  }

  return (
    <button
      onClick={() => { setDraft(name || ""); setEditing(true); }}
      className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 group"
    >
      <span className={name ? "text-gray-800 dark:text-gray-200" : "italic text-gray-400"}>
        {name || "Add name…"}
      </span>
      <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

function DiffCard({ label, count, positive }) {
  const Icon = positive ? TrendingUp : TrendingDown;
  const color = count === 0 ? "text-gray-400" : positive ? "text-green-600" : "text-red-600";
  const bg = count === 0 ? "bg-gray-50 dark:bg-gray-700" : positive ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20";

  return (
    <div className={`${bg} rounded-lg p-4 text-center`}>
      <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
      <p className={`text-2xl font-bold ${color}`}>{count}</p>
      <p className="text-xs text-gray-600 dark:text-gray-400">{label}</p>
    </div>
  );
}

function UserDiffList({ title, users, color }) {
  const [expanded, setExpanded] = useState(false);
  if (!users || users.length === 0) return null;

  return (
    <div className={`border rounded-lg border-${color}-200 dark:border-${color}-800`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        <span className="font-medium text-sm text-gray-900 dark:text-gray-200">{title}</span>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold text-${color}-600`}>{users.length}</span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>
      {expanded && (
        <div className="border-t dark:border-gray-700 px-3 pb-3 max-h-60 overflow-y-auto">
          {users.map((u, i) => {
            const username = typeof u === "string" ? u : u.username;
            const href = typeof u === "object" ? u.href : null;
            const profileUrl = href || `https://www.instagram.com/${username}/`;
            return (
              <div key={i} className="py-1.5 text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <a
                  href={profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-purple-600 dark:hover:text-purple-400 flex items-center gap-1"
                >
                  @{username}
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
