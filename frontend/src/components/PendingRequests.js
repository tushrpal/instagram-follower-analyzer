import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";

export function PendingRequests() {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const { sessionId } = useParams();

  useEffect(() => {
    const fetchPendingRequests = async () => {
      try {
        const response = await axios.get(
          `/api/analysis/${sessionId}/pending-requests`
        );

        if (!response.data) {
          throw new Error("No pending requests data received");
        }

        const data = response.data;
        setPendingRequests(data.pendingRequests || []);
        setTotalCount(data.summary?.totalCount || 0);
        setError(null);
      } catch (error) {
        console.error("Error fetching pending requests:", error);
        if (error.response?.status === 404) {
          setError(
            "Analysis session not found. Please upload your Instagram data first."
          );
        } else {
          setError(error.message);
        }
        setPendingRequests([]);
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchPendingRequests();
    } else {
      setError(
        "No session ID provided. Please upload your Instagram data first."
      );
      setLoading(false);
    }
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Pending Follow Requests</h2>
        <span className="text-sm text-gray-600">
          Total Requests: {totalCount}
        </span>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        {error ? (
          <div className="text-red-500 p-4 bg-red-50 rounded-lg">
            <p className="mb-3">{error}</p>
            {error.includes("upload") && (
              <Link
                to="/"
                className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
              >
                Go to Upload Page
              </Link>
            )}
          </div>
        ) : pendingRequests.length === 0 ? (
          <p className="text-gray-600">No pending follow requests found.</p>
        ) : (
          <div className="grid gap-4">
            {pendingRequests.map((request, index) => (
              <div
                key={index}
                className="border rounded-lg p-4 hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <a
                      href={request.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-blue-600 hover:text-blue-800"
                    >
                      {request.username}
                    </a>
                    <p className="text-sm text-gray-600">
                      Requested on:{" "}
                      {new Date(request.requestDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-sm">
                    <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                      {request.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
