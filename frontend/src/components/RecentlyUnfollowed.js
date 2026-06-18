import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { formatDistanceToNow } from "date-fns";

const UnfollowedUser = React.memo(({ user }) => (
  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
    <div className="flex items-center space-x-3">
      <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
        <span className="text-white font-semibold">
          {user.username.charAt(0).toUpperCase()}
        </span>
      </div>
      <div>
        <p className="font-medium text-gray-900 dark:text-gray-100">@{user.username}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Unfollowed {formatDistanceToNow(new Date(user.unfollowed_at))} ago
        </p>
      </div>
    </div>
    {user.profile_url && (
      <a
        href={user.profile_url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 text-sm font-medium"
      >
        View Profile
      </a>
    )}
  </div>
));

const RecentlyUnfollowed = ({ sessionId, searchQuery, onSearchChange }) => {
  const [unfollowedProfiles, setUnfollowedProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const LIMIT = 20;

  const fetchUnfollowedProfiles = useCallback(
    async (pageNumber = 1, search = null) => {
      if (!sessionId) return;

      try {
        setLoading(true);
        const params = {
          page: pageNumber,
          limit: LIMIT,
        };

        if (search && search.trim()) {
          params.search = search.trim();
        }

        const response = await axios.get(
          `/api/analysis/${sessionId}/unfollowed`,
          { params }
        );

        if (response.data && response.data.data) {
          const profiles = response.data.data;
          const pagination = response.data.pagination;

          setTotalPages(pagination.totalPages);
          setTotalItems(pagination.totalItems);
          setUnfollowedProfiles(profiles);
          setError(null);
        } else {
          throw new Error("Invalid response format from server");
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err.message || "Failed to fetch unfollowed profiles");
        setUnfollowedProfiles([]);
      } finally {
        setLoading(false);
      }
    },
    [sessionId]
  );

  useEffect(() => {
    fetchUnfollowedProfiles(1, searchQuery);
    setPage(1);
  }, [fetchUnfollowedProfiles, searchQuery]);

  useEffect(() => {
    if (page > 1) {
      fetchUnfollowedProfiles(page, searchQuery);
    }
  }, [page, fetchUnfollowedProfiles, searchQuery]);

  const renderedProfiles = useMemo(
    () =>
      unfollowedProfiles.map((user) => (
        <UnfollowedUser
          key={`${user.username}-${user.unfollowed_at}`}
          user={user}
        />
      )),
    [unfollowedProfiles]
  );

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="text-red-500 p-4">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">Recently Unfollowed</h2>
      </div>

      {searchQuery && (
        <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          {loading
            ? "Searching..."
            : `${totalItems} results found for "${searchQuery}"`}
        </div>
      )}

      {loading && page === 1 ? (
        <div className="text-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-2"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading unfollowed profiles...</p>
        </div>
      ) : unfollowedProfiles.length > 0 ? (
        <>
          <div className="space-y-4">{renderedProfiles}</div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center mt-6 gap-2">
              <button
                className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={page === 1 || loading}
                onClick={() => setPage(page > 1 ? page - 1 : 1)}
              >
                Prev
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {page} of {totalPages}
              </span>
              <button
                className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={page >= totalPages || loading}
                onClick={() =>
                  setPage(page < totalPages ? page + 1 : totalPages)
                }
              >
                Next
              </button>
            </div>
          )}

          {loading && page > 1 && (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
            </div>
          )}
        </>
      ) : (
        <p className="text-gray-500 dark:text-gray-400">
          {searchQuery
            ? `No unfollowed profiles found matching "${searchQuery}"`
            : "No unfollowed profiles found"}
        </p>
      )}
    </div>
  );
};

export default RecentlyUnfollowed;
