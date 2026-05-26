import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowRight, TrendingUp, TrendingDown, ChevronUp, ChevronDown } from "lucide-react";
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p className="text-gray-600">Loading session history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Session History</h1>
        <p className="text-gray-600">{sessions.length} analysis sessions</p>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <p className="text-gray-500 mb-4">No analysis sessions yet.</p>
          <Link to="/" className="text-purple-600 hover:text-purple-700 font-medium">
            Upload your first Instagram export
          </Link>
        </div>
      ) : (
        <>
          {/* Session Table */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Followers</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Following</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Mutual</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Compare</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sessions.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(s.processedAt || s.createdAt).toLocaleDateString(undefined, {
                          year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-medium">{s.followersCount}</td>
                      <td className="px-4 py-3 text-center text-sm font-medium">{s.followingCount}</td>
                      <td className="px-4 py-3 text-center text-sm font-medium">{s.mutualCount}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                            <input
                              type="radio"
                              name="compareA"
                              checked={compareA === s.id}
                              onChange={() => setCompareA(s.id)}
                              className="accent-purple-600"
                            /> A
                          </label>
                          <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
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
                      <td className="px-4 py-3 text-center">
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
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">Comparison Results</h2>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-500 uppercase mb-1">Session A</p>
                  <p className="text-sm font-medium">{new Date(comparison.sessionA.createdAt).toLocaleDateString()}</p>
                  <p className="text-lg font-bold text-purple-600">{comparison.sessionA.followersCount} followers</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-500 uppercase mb-1">Session B</p>
                  <p className="text-sm font-medium">{new Date(comparison.sessionB.createdAt).toLocaleDateString()}</p>
                  <p className="text-lg font-bold text-purple-600">{comparison.sessionB.followersCount} followers</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <DiffCard label="New Followers" count={comparison.summary.newFollowersCount} positive />
                <DiffCard label="Lost Followers" count={comparison.summary.lostFollowersCount} positive={false} />
                <DiffCard label="New Following" count={comparison.summary.newFollowingCount} positive />
                <DiffCard label="Stopped Following" count={comparison.summary.removedFollowingCount} positive={false} />
              </div>

              {/* Expandable user lists */}
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

function DiffCard({ label, count, positive }) {
  const Icon = positive ? TrendingUp : TrendingDown;
  const color = count === 0 ? "text-gray-400" : positive ? "text-green-600" : "text-red-600";
  const bg = count === 0 ? "bg-gray-50" : positive ? "bg-green-50" : "bg-red-50";

  return (
    <div className={`${bg} rounded-lg p-4 text-center`}>
      <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
      <p className={`text-2xl font-bold ${color}`}>{count}</p>
      <p className="text-xs text-gray-600">{label}</p>
    </div>
  );
}

function UserDiffList({ title, users, color }) {
  const [expanded, setExpanded] = useState(false);
  if (!users || users.length === 0) return null;

  return (
    <div className={`border rounded-lg border-${color}-200`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50"
      >
        <span className="font-medium text-sm text-gray-900">{title}</span>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold text-${color}-600`}>{users.length}</span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>
      {expanded && (
        <div className="border-t px-3 pb-3 max-h-60 overflow-y-auto">
          {users.map((u, i) => (
            <div key={i} className="py-1.5 text-sm text-gray-700">@{u}</div>
          ))}
        </div>
      )}
    </div>
  );
}
