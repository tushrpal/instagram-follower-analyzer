import React from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export function TimelineChart({ timelineData }) {
  if (!timelineData || !timelineData.followEvents.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        No timeline data available
      </div>
    );
  }

  const data = {
    labels: timelineData.followEvents.map((event) =>
      new Date(event.timestamp).toLocaleDateString()
    ),
    datasets: [
      {
        label: "Followers Growth",
        data: timelineData.followEvents.map((_, index) => index + 1),
        borderColor: "rgb(147, 51, 234)",
        backgroundColor: "rgba(147, 51, 234, 0.5)",
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "Follower Growth Timeline",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Number of Followers",
        },
      },
      x: {
        title: {
          display: true,
          text: "Date",
        },
      },
    },
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <Line data={data} options={options} />
    </div>
  );
}
