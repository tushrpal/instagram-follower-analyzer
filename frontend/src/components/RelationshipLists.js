import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { AlertCircle, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import axios from "axios";
import { formatDistanceToNow } from "date-fns";

const LIST_TYPE_META = {
  close_friend: { label: "Close Friends", icon: "💚", description: "Your close friends list" },
  blocked: { label: "Blocked Profiles", icon: "🚫", description: "Accounts you've blocked" },
  hidden_story: { label: "Hidden Story From", icon: "👁️", description: "People you hide stories from" },
  restricted: { label: "Restricted Profiles", icon: "⚠️", description: "Accounts you've restricted" },
  favorited: { label: "Favorited Profiles", icon: "⭐", description: "Profiles you've favorited" },
  removed_suggestion: { label: "Removed Suggestions", icon: "🗑️", description: "Suggestions you've dismissed" },
  received_request: { label: "Received Follow Requests", icon: "📥", description: "Follow requests you received" },
  recent_request: { label: "Recent Follow Requests", icon: "📤", description: "Your recent follow requests" },
};

function RelationshipCard({ sessionId, listType, count }) {
  const [expanded, setExpanded] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const meta = LIST_TYPE_META[listType];

  useEffect(() => {
    if (!expanded) return;
    const loadProfiles = async () => {
      setLoading(true);
      try {
        const res = await axios.get(
          `/api/analysis/${sessionId}/relationships/${listType}`,
          { params: { page, limit: 20 } }
        );
        setProfiles(res.data.profiles);
        setTotalPages(res.data.pagination.totalPages);
      } catch (err) {
        console.error("Failed to load profiles:", err);
      } finally {
        setLoading(false);
      }
    };
    loadProfiles();
  }, [expanded, page, sessionId, listType]);

  if (!meta) return null;

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{meta.icon}</span>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">{meta.label}</h3>
            <p className="text-sm text-gray-500">{meta.description}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className="bg-purple-100 text-purple-700 font-bold px-3 py-1 rounded-full text-sm">
            {count}
          </span>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t px-5 pb-5">
          {loading ? (
            <div className="py-8 text-center text-gray-400">Loading...</div>
          ) : profiles.length === 0 ? (
            <div className="py-8 text-center text-gray-400">No profiles found</div>
          ) : (
            <>
              <div className="divide-y">
                {profiles.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-semibold">
                          {(p.username || "?").charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">@{p.username}</p>
                        {p.display_name && (
                          <p className="text-xs text-gray-500">{p.display_name}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 text-sm text-gray-400">
                      {p.timestamp && (
                        <span>{formatDistanceToNow(new Date(p.timestamp * 1000), { addSuffix: true })}</span>
                      )}
                      {p.profile_url && (
                        <a href={p.profile_url} target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:text-purple-700">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex justify-center items-center mt-4 gap-2">
                  <button
                    className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-sm"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >Prev</button>
                  <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
                  <button
                    className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                  >Next</button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function RelationshipLists() {
  const { sessionId } = useParams();
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`/api/analysis/${sessionId}/relationships`);
        setCounts(res.data.counts);
      } catch (err) {
        setError("Failed to load relationship data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p className="text-gray-600">Loading relationships...</p>
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

  const totalProfiles = Object.values(counts).reduce((s, c) => s + c, 0);
  const listTypes = Object.keys(LIST_TYPE_META);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Relationship Lists</h1>
        <p className="text-gray-600">{totalProfiles} profiles across {Object.keys(counts).length} lists</p>
      </div>

      <div className="space-y-4">
        {listTypes.map((lt) => (
          <RelationshipCard
            key={lt}
            sessionId={sessionId}
            listType={lt}
            count={counts[lt] || 0}
          />
        ))}
      </div>
    </div>
  );
}
