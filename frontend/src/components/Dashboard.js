import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Users,
  UserCheck,
  UserPlus,
  Search,
  Download,
  AlertCircle,
  Loader,
} from "lucide-react";
import axios from "axios";
import { TimelineChart } from "./TimelineChart";

export function Dashboard() {
  const { sessionId } = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [users, setUsers] = useState({});
  const [activeTab, setActiveTab] = useState("mutual");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20); // You can make this adjustable if you want
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [timelineView, setTimelineView] = useState("all");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingExport, setLoadingExport] = useState(false);

  useEffect(() => {
    const loadTimelineData = async () => {
      if (!sessionId) return;

      try {
        const response = await axios.get(
          `/api/analysis/${sessionId}/timeline`,
          {
            params: { timeframe: timelineView },
          }
        );

        if (response.data && response.data.timelineData) {
          setAnalysis((prev) => ({
            ...prev,
            timeline: response.data.timelineData,
            statistics: response.data.statistics,
          }));
        }
      } catch (error) {
        console.error("Failed to load timeline data:", error);
        // Don't set error state here to prevent blocking the whole dashboard
      }
    };

    if (analysis?.summary) {
      // Only load timeline data if we have the basic analysis
      loadTimelineData();
    }
  }, [sessionId, timelineView, analysis?.summary]);

  useEffect(() => {
    const loadAnalysis = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get(`/api/analysis/${sessionId}`);

        if (!response.data) {
          throw new Error("No analysis data received");
        }

        setAnalysis(response.data);
        // Removed the redundant timeline data loading here
      } catch (error) {
        setError(
          error.response?.data?.error || "Failed to load analysis results"
        );
        console.error("Analysis error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAnalysis();
  }, [sessionId]);

  // Reset page and clear search results when tab changes
  useEffect(() => {
    setPage(1);
    setSearchResults(null);
    setSearchQuery(""); // Optional: clear search when switching tabs
  }, [activeTab]);

  // Reset page when search query changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  // Fetch users or search results when page, tab, search, or session changes
  useEffect(() => {
    if (searchQuery.trim()) {
      handleSearch(page);
    } else if (activeTab) {
      loadUsers(activeTab, page);
    }
  }, [page, activeTab, searchQuery, sessionId]);

  // Update the loadUsers function
  const loadUsers = async (category, pageNum = 1) => {
    try {
      setLoadingUsers(true);
      const response = await axios.get(
        `/api/analysis/${sessionId}/${category}?page=${pageNum}&limit=${limit}`
      );
      setUsers((prev) => ({
        ...prev,
        [category]: response.data.users,
      }));
      console.log("User data:", response.data);
      setTotalUsers(response.data.total); // total users
      setTotalPages(response.data.pagination.totalPages || 1); // total pages from backend
    } catch (error) {
      console.error(`Failed to load ${category} users:`, error);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Update the search handling
  const handleSearch = async (pageNum = 1) => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    try {
      setLoadingSearch(true);
      const response = await axios.get(
        `/api/analysis/${sessionId}/search/${encodeURIComponent(searchQuery)}`,
        {
          params: {
            page: pageNum,
            limit: limit,
          },
        }
      );

      setSearchResults({
        ...response.data,
        page: pageNum,
        limit: limit,
        totalPages: Math.ceil(response.data.pagination.totalFound / limit),
      });
    } catch (error) {
      console.error("Search failed:", error);
      setError("Search failed. Please try again.");
    } finally {
      setLoadingSearch(false);
    }
  };

  const exportData = async (category = null) => {
    try {
      setLoadingExport(true);
      const url = category
        ? `/api/analysis/${sessionId}/export?category=${category}`
        : `/api/analysis/${sessionId}/export`;

      const response = await axios.get(url, { responseType: "blob" });

      // Create a temporary anchor element
      const downloadUrl = window.URL.createObjectURL(response.data);
      const fileName = category
        ? `instagram_${category}_analysis.csv`
        : "instagram_full_analysis.csv";

      // Use download attribute instead of click event
      const link = document.createElement("a");
      link.setAttribute("href", downloadUrl);
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the URL object
      setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 100);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setLoadingExport(false);
    }
  };

  // Add proper error boundary
  const handleError = (error) => {
    console.error("Dashboard error:", error);
    setError(error.message || "An unexpected error occurred");
  };

  // Add proper loading state handling
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p className="text-gray-600">Loading analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Analysis Not Found
        </h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <a
          href="/"
          className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Start New Analysis
        </a>
      </div>
    );
  }

  const tabs = [
    {
      id: "mutual",
      label: "Mutual Followers",
      icon: UserCheck,
      count: analysis?.summary.mutualCount || 0,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
    },
    {
      id: "followers_only",
      label: "Followers Only",
      icon: Users,
      count: analysis?.summary.followersOnlyCount || 0,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    {
      id: "following_only",
      label: "Following Only",
      icon: UserPlus,
      count: analysis?.summary.followingOnlyCount || 0,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
    },
  ];

  const searchResultKeyMap = {
    mutual: "mutual",
    followers_only: "followersOnly",
    following_only: "followingOnly",
  };

  // Use paginated results for current page
  const currentUsers = searchResults
    ? searchResults.results[searchResultKeyMap[activeTab]] || []
    : users[activeTab] || [];

  const GrowthStats = ({ statistics }) => (
    <div className="grid grid-cols-3 gap-4 mb-8">
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-500">Daily Growth</h3>
        <p
          className={`text-2xl font-bold ${
            statistics.dailyGrowth >= 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          {statistics.dailyGrowth > 0 ? "+" : ""}
          {statistics.dailyGrowth}
        </p>
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-500">Weekly Growth</h3>
        <p
          className={`text-2xl font-bold ${
            statistics.weeklyGrowth >= 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          {statistics.weeklyGrowth > 0 ? "+" : ""}
          {statistics.weeklyGrowth}
        </p>
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-500">Monthly Growth</h3>
        <p
          className={`text-2xl font-bold ${
            statistics.monthlyGrowth >= 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          {statistics.monthlyGrowth > 0 ? "+" : ""}
          {statistics.monthlyGrowth}
        </p>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Your Instagram Analysis
        </h1>
        <p className="text-gray-600">
          Analysis completed on{" "}
          {new Date(analysis.processedAt).toLocaleDateString()}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <div
              key={tab.id}
              className={`${tab.bgColor} ${
                tab.borderColor
              } border rounded-xl p-6 cursor-pointer transition-all hover:shadow-lg ${
                activeTab === tab.id ? "ring-2 ring-purple-500" : ""
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <div className="flex items-center justify-between mb-4">
                <Icon className={`w-8 h-8 ${tab.color}`} />
                <span className={`text-2xl font-bold ${tab.color}`}>
                  {tab.count}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900">{tab.label}</h3>
              <p className="text-sm text-gray-600 mt-1">
                {tab.id === "mutual" &&
                  "People who follow you and you follow back"}
                {tab.id === "followers_only" &&
                  "People who follow you but you don't follow back"}
                {tab.id === "following_only" &&
                  "People you follow but don't follow you back"}
              </p>
            </div>
          );
        })}
      </div>

      {/* Timeline Chart */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Growth Timeline
          </h2>
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            onChange={(e) => setTimelineView(e.target.value)}
            defaultValue="all"
          >
            <option value="all">All Time</option>
            <option value="year">Past Year</option>
            <option value="month">Past Month</option>
            <option value="week">Past Week</option>
          </select>
        </div>
        <TimelineChart timelineData={analysis?.timeline} />
      </div>

      {/* Growth Statistics */}
      {analysis?.statistics && <GrowthStats statistics={analysis.statistics} />}

      {/* Search and Export */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-grow max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search usernames..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => exportData(activeTab)}
              className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Current
            </button>
            <button
              onClick={() => exportData()}
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Export All
            </button>
          </div>
        </div>
      </div>

      {/* User List */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {searchResults
              ? `Search Results (${searchResults.pagination.totalFound} found)`
              : tabs.find((t) => t.id === activeTab)?.label}
          </h2>
          <span className="text-gray-500">{currentUsers.length} users</span>
        </div>

        {currentUsers.length > 0 ? (
          <>
            <div className="grid gap-3">
              {currentUsers.map((user, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold">
                        {(user.username || "?").charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        @{user.username}
                      </p>
                      {searchResults && (
                        <p className="text-sm text-gray-500 capitalize">
                          {user.category.replace("_", " ")}
                        </p>
                      )}
                    </div>
                  </div>

                  {user.href && (
                    <a
                      href={user.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                    >
                      View Profile
                    </a>
                  )}
                </div>
              ))}
            </div>
            {/* Pagination Controls */}
            <div className="flex justify-center items-center mt-6 gap-2">
              <button
                className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
                disabled={page === 1}
                onClick={() => setPage(page > 1 ? page - 1 : 1)}
              >
                Prev
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
                disabled={page >= totalPages}
                onClick={() =>
                  setPage(page < totalPages ? page + 1 : totalPages)
                }
              >
                Next
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchQuery
                ? "No users found matching your search."
                : "No users in this category."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
