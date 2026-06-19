import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Users,
  UserCheck,
  UserPlus,
  Search,
  Download,
  AlertCircle,
  UserMinus,
  X,
} from "lucide-react";
import axios from "axios";
import { TimelineChart } from "./TimelineChart";
import RecentlyUnfollowed from "./RecentlyUnfollowed";
import { UserRow } from "./UserRow";
import { InstagramConnect } from "./InstagramConnect";
import { ApiInsights } from "./ApiInsights";

export function Dashboard() {
  const { sessionId } = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [users, setUsers] = useState({});
  const [activeTab, setActiveTab] = useState("mutual");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showUnfollowed, setShowUnfollowed] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20); // You can make this adjustable if you want
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [timelineView, setTimelineView] = useState("all");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingExport, setLoadingExport] = useState(false);
  const [igApiConnected, setIgApiConnected] = useState(false);

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

        // Check sessionStorage first (fresh upload processed in browser)
        const cached = sessionStorage.getItem(`session_${sessionId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          setAnalysis({
            sessionId,
            summary: parsed.summary,
            createdAt: new Date().toISOString(),
            _local: true,
          });
          setLoading(false);
          return;
        }

        // Fallback: load from backend (returning to an old session)
        const response = await axios.get(`/api/analysis/${sessionId}`);
        if (!response.data) throw new Error("No analysis data received");
        setAnalysis(response.data);
      } catch (error) {
        setError(error.response?.data?.error || "Failed to load analysis results");
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

  // Update the search handling
  const handleSearch = async (pageNum = 1) => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      loadUsers(activeTab, 1);
      setPage(1);
      return;
    }

    try {
      setLoadingSearch(true);

      const local = getLocalData();
      if (local) {
        const categoryMap = { mutual: local.mutual, followers_only: local.followersOnly, following_only: local.followingOnly };
        const all = categoryMap[activeTab] || [];
        const q = searchQuery.toLowerCase();
        const filtered = all.filter((u) => u.username.toLowerCase().includes(q));
        const start = (pageNum - 1) * limit;
        setSearchResults({
          category: activeTab,
          results: { [activeTab]: filtered.slice(start, start + limit) },
          pagination: { page: pageNum, limit, totalItems: filtered.length, totalPages: Math.ceil(filtered.length / limit) || 1 },
          page: pageNum,
          limit,
          totalPages: Math.ceil(filtered.length / limit) || 1,
        });
        return;
      }

      const response = await axios.get(
        `/api/analysis/${sessionId}/search/${encodeURIComponent(searchQuery)}`,
        { params: { page: pageNum, limit, category: activeTab !== "unfollowed" ? activeTab : null } }
      );
      const searchData = response.data;
      const totalPages = searchData.category
        ? searchData.pagination.totalPages
        : Math.ceil(searchData.pagination.totalFound / limit);
      setSearchResults({ ...searchData, page: pageNum, limit, totalPages });
    } catch (error) {
      console.error("Search failed:", error);
      setError("Search failed. Please try again.");
    } finally {
      setLoadingSearch(false);
    }
  };

  // Fetch users or search results when page, tab, search, or session changes
  useEffect(() => {
    if (searchQuery.trim()) {
      handleSearch(page);
    } else if (activeTab && activeTab !== "unfollowed") {
      loadUsers(activeTab, page);
    }
  }, [page, activeTab, sessionId]); // Removed searchQuery from dependencies

  // Handle search query changes separately
  useEffect(() => {
    if (searchQuery.trim()) {
      handleSearch(1); // Always start from page 1 when search query changes
    } else if (activeTab && activeTab !== "unfollowed") {
      loadUsers(activeTab, 1); // Load first page when search is cleared
    }
  }, [searchQuery]);

  const getLocalData = () => {
    const cached = sessionStorage.getItem(`session_${sessionId}`);
    return cached ? JSON.parse(cached) : null;
  };

  // Update the loadUsers function
  const loadUsers = async (category, pageNum = 1) => {
    try {
      setLoadingUsers(true);

      const local = getLocalData();
      if (local) {
        const categoryMap = { mutual: local.mutual, followers_only: local.followersOnly, following_only: local.followingOnly };
        const all = categoryMap[category] || [];
        const filtered = searchQuery.trim()
          ? all.filter((u) => u.username.toLowerCase().includes(searchQuery.toLowerCase()))
          : all;
        const start = (pageNum - 1) * limit;
        setUsers((prev) => ({ ...prev, [category]: filtered.slice(start, start + limit) }));
        setTotalUsers(filtered.length);
        setTotalPages(Math.ceil(filtered.length / limit) || 1);
        return;
      }

      const response = await axios.get(`/api/analysis/${sessionId}/${category}?page=${pageNum}&limit=${limit}`);
      setUsers((prev) => ({ ...prev, [category]: response.data.users }));
      setTotalUsers(response.data.total);
      setTotalPages(response.data.pagination.totalPages || 1);
    } catch (error) {
      console.error(`Failed to load ${category} users:`, error);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Clear search function
  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults(null);
    setPage(1);
    loadUsers(activeTab, 1);
  };

  const exportData = async (category = null) => {
    try {
      setLoadingExport(true);

      const local = getLocalData();
      if (local) {
        const categoryMap = { mutual: local.mutual, followers_only: local.followersOnly, following_only: local.followingOnly };
        let rows = [];
        if (category && categoryMap[category]) {
          rows = categoryMap[category].map((u) => ({ ...u, category }));
        } else {
          rows = [
            ...local.mutual.map((u) => ({ ...u, category: "mutual" })),
            ...local.followersOnly.map((u) => ({ ...u, category: "followers_only" })),
            ...local.followingOnly.map((u) => ({ ...u, category: "following_only" })),
          ];
        }
        const csv = "Username,Category,Profile URL\n" + rows.map((u) => `"${u.username}","${u.category}","${u.href || ""}"`).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = category ? `instagram_${category}.csv` : "instagram_analysis.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 100);
        return;
      }

      const url = category
        ? `/api/analysis/${sessionId}/export?category=${category}`
        : `/api/analysis/${sessionId}/export`;
      const response = await axios.get(url, { responseType: "blob" });
      const downloadUrl = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.setAttribute("href", downloadUrl);
      link.setAttribute("download", category ? `instagram_${category}_analysis.csv` : "instagram_full_analysis.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
          <p className="text-gray-600 dark:text-gray-400">Loading analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Analysis Not Found
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
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
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-900/20",
      borderColor: "border-green-200 dark:border-green-700",
    },
    {
      id: "followers_only",
      label: "Followers Only",
      icon: Users,
      count: analysis?.summary.followersOnlyCount || 0,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      borderColor: "border-blue-200 dark:border-blue-700",
    },
    {
      id: "following_only",
      label: "Following Only",
      icon: UserPlus,
      count: analysis?.summary.followingOnlyCount || 0,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-900/20",
      borderColor: "border-orange-200 dark:border-orange-700",
    },
    {
      id: "unfollowed",
      label: "Recently Unfollowed",
      icon: UserMinus,
      count: analysis?.summary.unfollowedCount || 0,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
      borderColor: "border-purple-200 dark:border-purple-700",
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

  // Use appropriate pagination values based on search state
  const currentTotalPages = searchResults
    ? searchResults.totalPages
    : totalPages;

  const currentTotalUsers = searchResults
    ? searchResults.category
      ? searchResults.pagination.total
      : searchResults.pagination.totalFound
    : totalUsers;
  const GrowthStats = ({ statistics }) => (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Daily Growth</h3>
        <p className={`text-xl sm:text-2xl font-bold ${statistics.dailyGrowth >= 0 ? "text-green-600" : "text-red-600"}`}>
          {statistics.dailyGrowth > 0 ? "+" : ""}{statistics.dailyGrowth}
        </p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Weekly Growth</h3>
        <p className={`text-xl sm:text-2xl font-bold ${statistics.weeklyGrowth >= 0 ? "text-green-600" : "text-red-600"}`}>
          {statistics.weeklyGrowth > 0 ? "+" : ""}{statistics.weeklyGrowth}
        </p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Monthly Growth</h3>
        <p className={`text-xl sm:text-2xl font-bold ${statistics.monthlyGrowth >= 0 ? "text-green-600" : "text-red-600"}`}>
          {statistics.monthlyGrowth > 0 ? "+" : ""}{statistics.monthlyGrowth}
        </p>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">
          Your Instagram Analysis
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Analysis completed on{" "}
          {new Date(analysis.processedAt).toLocaleDateString()}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <div
              key={tab.id}
              className={`${tab.bgColor} ${tab.borderColor} border rounded-xl p-6 cursor-pointer transition-all hover:shadow-lg ${
                activeTab === tab.id ? "ring-2 ring-purple-500" : ""
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <div className="flex items-center justify-between mb-4">
                <Icon className={`w-8 h-8 ${tab.color}`} />
                <span className={`text-2xl font-bold ${tab.color}`}>{tab.count}</span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">{tab.label}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {tab.id === "mutual" && "People who follow you and you follow back"}
                {tab.id === "followers_only" && "People who follow you but you don't follow back"}
                {tab.id === "following_only" && "People you follow but don't follow you back"}
                {tab.id === "unfollowed" && "People you have recently unfollowed"}
              </p>
            </div>
          );
        })}
      </div>

      {/* Timeline Chart */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Growth Timeline</h2>
          <select
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
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

      {/* Account Insights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 text-center">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1">Follow-back Rate</p>
          <p className="text-xl sm:text-2xl font-bold text-purple-600">
            {analysis?.summary?.totalFollowing > 0
              ? Math.round((analysis.summary.mutualCount / analysis.summary.totalFollowing) * 100)
              : 0}%
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">of people you follow, follow back</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 text-center">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1">Fan Rate</p>
          <p className="text-xl sm:text-2xl font-bold text-blue-600">
            {analysis?.summary?.totalFollowers > 0
              ? Math.round((analysis.summary.followersOnlyCount / analysis.summary.totalFollowers) * 100)
              : 0}%
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">of followers are fans only</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 text-center">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1">Close Friends</p>
          <p className="text-xl sm:text-2xl font-bold text-green-600">
            {analysis?.relationshipCounts?.close_friend || 0}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">on your close friends list</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 text-center">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1">Relationship Lists</p>
          <p className="text-xl sm:text-2xl font-bold text-orange-600">
            {analysis?.relationshipCounts
              ? Object.values(analysis.relationshipCounts).reduce((s, c) => s + c, 0)
              : 0}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">total profiles across all lists</p>
        </div>
      </div>

      {/* Growth Statistics */}
      {analysis?.statistics && <GrowthStats statistics={analysis.statistics} />}

      {/* Instagram Graph API — optional Pro account integration */}
      <div className="mb-8 space-y-4">
        <InstagramConnect onStatusChange={(s) => setIgApiConnected(s?.connected || false)} />
        {igApiConnected && <ApiInsights />}
      </div>

      {/* Search and Export */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
          <div className="relative flex-grow max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search usernames..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 w-5 h-5"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => exportData(activeTab)}
              className="inline-flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
            {searchResults
              ? `Search Results (${
                  searchResults.category
                    ? searchResults.pagination.total
                    : searchResults.pagination.totalFound
                } found)`
              : tabs.find((t) => t.id === activeTab)?.label}
          </h2>
          {activeTab !== "unfollowed" && (
            <span className="text-gray-500 dark:text-gray-400 text-sm">
              {searchResults
                ? `${currentUsers.length} of ${currentTotalUsers} users`
                : `${currentUsers.length} users`}
            </span>
          )}
          {activeTab === "unfollowed" && (
            <span className="text-gray-500 dark:text-gray-400 text-sm">
              {analysis?.summary.unfollowedCount || 0} users
            </span>
          )}
        </div>

        {activeTab === "unfollowed" ? (
          <RecentlyUnfollowed
            sessionId={sessionId}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        ) : currentUsers.length > 0 ? (
          <>
            <div className="divide-y dark:divide-gray-700">
              {currentUsers.map((user, index) => (
                <UserRow
                  key={index}
                  username={user.username || "?"}
                  href={user.href}
                />
              ))}
            </div>
            {/* Pagination Controls */}
            <div className="flex justify-center items-center mt-6 gap-2">
              <button
                className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm dark:text-gray-300"
                disabled={page === 1}
                onClick={() => setPage(page > 1 ? page - 1 : 1)}
              >
                Prev
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {page} of {currentTotalPages}
              </span>
              <button
                className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm dark:text-gray-300"
                disabled={page >= currentTotalPages}
                onClick={() => setPage(page < currentTotalPages ? page + 1 : currentTotalPages)}
              >
                Next
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery ? "No users found matching your search." : "No users in this category."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
