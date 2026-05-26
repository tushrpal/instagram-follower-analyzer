import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { AlertCircle, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import axios from "axios";

const INSIGHT_CONFIG = [
  {
    key: "closeFriendsNotFollowingBack",
    label: "Close Friends Not Following You Back",
    description: "People on your close friends list who don't follow you",
    color: "border-yellow-300 bg-yellow-50",
    badge: "bg-yellow-100 text-yellow-800",
    icon: "💔",
  },
  {
    key: "closeFriendsYouDontFollow",
    label: "Close Friends You Don't Follow",
    description: "People on your close friends list that you don't follow back",
    color: "border-yellow-300 bg-yellow-50",
    badge: "bg-yellow-100 text-yellow-800",
    icon: "🤔",
  },
  {
    key: "blockedStillInFollowers",
    label: "Blocked Users Still in Followers",
    description: "Accounts you've blocked that still appear as followers",
    color: "border-red-300 bg-red-50",
    badge: "bg-red-100 text-red-800",
    icon: "🚨",
  },
  {
    key: "hiddenStoryMutual",
    label: "Hidden Story - Mutual Followers",
    description: "Mutual followers you're hiding your stories from",
    color: "border-blue-300 bg-blue-50",
    badge: "bg-blue-100 text-blue-800",
    icon: "👁️",
  },
  {
    key: "requestConversions",
    label: "Follow Request Conversions",
    description: "Recent follow requests that resulted in a connection",
    color: "border-green-300 bg-green-50",
    badge: "bg-green-100 text-green-800",
    icon: "✅",
  },
  {
    key: "receivedNotAccepted",
    label: "Received Requests Not Accepted",
    description: "Follow requests you received but haven't accepted",
    color: "border-orange-300 bg-orange-50",
    badge: "bg-orange-100 text-orange-800",
    icon: "📥",
  },
  {
    key: "removedSuggestionsNowFollowing",
    label: "Removed Suggestions You Now Follow",
    description: "Suggestions you dismissed but ended up following anyway",
    color: "border-purple-300 bg-purple-50",
    badge: "bg-purple-100 text-purple-800",
    icon: "🔄",
  },
];

function InsightCard({ config, users }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`rounded-xl border-2 ${config.color} overflow-hidden shadow-sm`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 hover:opacity-90 transition-opacity"
      >
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{config.icon}</span>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">{config.label}</h3>
            <p className="text-sm text-gray-600">{config.description}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className={`font-bold px-3 py-1 rounded-full text-sm ${config.badge}`}>
            {users.length}
          </span>
          {users.length > 0 && (
            expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {expanded && users.length > 0 && (
        <div className="border-t border-gray-200 bg-white px-5 pb-4">
          <div className="divide-y">
            {users.map((u, i) => (
              <div key={i} className="flex items-center justify-between py-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-semibold">
                      {(u.username || "?").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">@{u.username}</p>
                    {u.displayName && <p className="text-xs text-gray-500">{u.displayName}</p>}
                  </div>
                </div>
                {u.profileUrl && (
                  <a href={u.profileUrl} target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:text-purple-700">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function Insights() {
  const { sessionId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`/api/analysis/${sessionId}/insights`);
        setData(res.data);
      } catch (err) {
        setError("Failed to load insights");
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
          <p className="text-gray-600">Analyzing cross-references...</p>
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

  const totalInsights = INSIGHT_CONFIG.reduce(
    (sum, c) => sum + (data?.insights?.[c.key]?.length || 0), 0
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Cross-Reference Insights</h1>
        <p className="text-gray-600">
          {totalInsights} findings across your relationship data
          {data?.conversionRate > 0 && (
            <span className="ml-2 inline-block bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-sm font-medium">
              {data.conversionRate}% follow request conversion rate
            </span>
          )}
        </p>
      </div>

      <div className="space-y-4">
        {INSIGHT_CONFIG.map((config) => (
          <InsightCard
            key={config.key}
            config={config}
            users={data?.insights?.[config.key] || []}
          />
        ))}
      </div>
    </div>
  );
}
