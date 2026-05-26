import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0]?.payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium text-gray-900 mb-2">
        {new Date(label).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
      </p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-gray-600">{entry.name}:</span>
          <span className="font-semibold">{entry.value}</span>
        </div>
      ))}
      {data?.usernames && data.usernames.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Activity on this day:</p>
          {data.usernames.slice(0, 5).map((u, i) => (
            <p key={i} className="text-xs text-gray-600">
              {u.direction === "follower" ? "+" : "→"} @{u.username}
            </p>
          ))}
          {data.usernames.length > 5 && (
            <p className="text-xs text-gray-400">+{data.usernames.length - 5} more</p>
          )}
        </div>
      )}
    </div>
  );
}

export function TimelineChart({ timelineData }) {
  const chartData = useMemo(() => {
    if (!timelineData?.followEvents) return [];

    const dateMap = new Map();

    timelineData.followEvents.forEach((event) => {
      const date = new Date(event.timestamp).toISOString().split("T")[0];
      const existing = dateMap.get(date);
      const usernames = existing?.usernames || [];
      usernames.push({ username: event.username, direction: event.direction });

      dateMap.set(date, {
        date,
        followers: event.followersCount,
        following: event.followingCount,
        netGrowth: event.followersCount - event.followingCount,
        usernames,
      });
    });

    return Array.from(dateMap.values()).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
  }, [timelineData]);

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No timeline data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickFormatter={(date) => new Date(date).toLocaleDateString()}
        />
        <YAxis />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Line
          type="monotone"
          dataKey="followers"
          stroke="#8884d8"
          name="Followers"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="following"
          stroke="#82ca9d"
          name="Following"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="netGrowth"
          stroke="#f97316"
          name="Net (Followers - Following)"
          strokeWidth={1.5}
          strokeDasharray="5 5"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
