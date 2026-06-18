import React, { useState, useEffect } from "react";
import { Users, Eye, TrendingUp, Clock, AlertCircle, Loader } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import axios from "axios";

export function ApiInsights() {
  const [overview, setOverview] = useState(null);
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [ovRes, actRes] = await Promise.allSettled([
          axios.get("/api/instagram/insights/overview"),
          axios.get("/api/instagram/insights/activity"),
        ]);
        if (ovRes.status === "fulfilled") setOverview(ovRes.value.data);
        if (actRes.status === "fulfilled") setActivity(actRes.value.data);
        if (ovRes.status === "rejected") setError(ovRes.reason?.response?.data?.error || "Failed to load live metrics.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Parse online_followers into hourly chart data
  const hourlyData = React.useMemo(() => {
    if (!activity?.data?.[0]?.values) return null;
    const values = activity.data[0].values;
    if (!values.length) return null;
    const hourBuckets = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00`, online: 0 }));
    values.forEach((v) => {
      if (v.value && typeof v.value === "object") {
        Object.entries(v.value).forEach(([h, count]) => {
          const idx = parseInt(h);
          if (idx >= 0 && idx < 24) hourBuckets[idx].online += count;
        });
      }
    });
    return hourBuckets;
  }, [activity]);

  const bestHour = React.useMemo(() => {
    if (!hourlyData) return null;
    return hourlyData.reduce((best, cur) => cur.online > best.online ? cur : best, hourlyData[0]);
  }, [hourlyData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader className="w-6 h-6 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="flex items-center gap-2 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm text-yellow-700 dark:text-yellow-400">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-purple-500" />
        Live Instagram Metrics
        <span className="text-xs font-normal text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">Graph API</span>
      </h3>

      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <MetricCard icon={Users} label="Followers (live)" value={overview.followers_count?.toLocaleString()} color="text-purple-600" />
          <MetricCard icon={Users} label="Following (live)" value={overview.follows_count?.toLocaleString()} color="text-blue-600" />
          <MetricCard icon={Eye} label="Posts" value={overview.media_count?.toLocaleString()} color="text-green-600" />
        </div>
      )}

      {hourlyData && (
        <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> Online followers by hour
            </h4>
            {bestHour && (
              <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                Best time to post: {bestHour.hour}
              </span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={hourlyData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={3} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(v) => [v, "Online"]}
                contentStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="online" fill="#9333ea" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <p className="text-xs text-gray-400 dark:text-gray-500">
        Follower lists (who follows you, who unfollowed you) require the ZIP export — the Graph API only provides aggregate metrics.
      </p>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 text-center">
      <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
      <p className={`text-xl font-bold ${color}`}>{value ?? "—"}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}
