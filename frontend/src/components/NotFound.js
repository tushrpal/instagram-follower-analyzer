import React from "react";
import { Link } from "react-router-dom";
import { Home, Search } from "lucide-react";

export function NotFound() {
  return (
    <div className="max-w-2xl mx-auto text-center py-16">
      <div className="mb-8">
        <Search className="w-20 h-20 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Page Not Found
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          The page you're looking for doesn't exist or has been moved.
        </p>
      </div>

      <div className="flex gap-4 justify-center">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
        >
          <Home className="w-5 h-5" />
          Back to Home
        </Link>
      </div>

      <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Looking for something specific?
        </p>
        <div className="flex flex-wrap gap-2 justify-center text-sm">
          <Link to="/sample-analysis/" className="text-purple-600 dark:text-purple-400 hover:underline">
            Sample Analysis
          </Link>
          <span className="text-gray-300 dark:text-gray-600">·</span>
          <Link to="/who-unfollowed-me/" className="text-purple-600 dark:text-purple-400 hover:underline">
            Who Unfollowed Me
          </Link>
          <span className="text-gray-300 dark:text-gray-600">·</span>
          <Link to="/blog/" className="text-purple-600 dark:text-purple-400 hover:underline">
            Blog
          </Link>
          <span className="text-gray-300 dark:text-gray-600">·</span>
          <Link to="/contact/" className="text-purple-600 dark:text-purple-400 hover:underline">
            Contact
          </Link>
        </div>
      </div>
    </div>
  );
}
