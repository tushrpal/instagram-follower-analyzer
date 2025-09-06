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

export function TimelineChart({ timelineData }) {
  const chartData = useMemo(() => {
    if (!timelineData?.followEvents) return [];

    // Create a map to store latest counts for each timestamp
    const dateMap = new Map();

    timelineData.followEvents.forEach((event) => {
      const date = new Date(event.timestamp).toISOString().split("T")[0];
      dateMap.set(date, {
        date,
        followers: event.followersCount,
        following: event.followingCount,
      });
    });

    // Convert map to array and sort by date
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
        <Tooltip
          labelFormatter={(label) => new Date(label).toLocaleDateString()}
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
        />
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
      </LineChart>
    </ResponsiveContainer>
  );
}
