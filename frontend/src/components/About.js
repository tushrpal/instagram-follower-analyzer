import React from "react";
import { Instagram, Shield, Eye, Database, Zap, Heart } from "lucide-react";
import { Link } from "react-router-dom";

export function About() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl mb-6">
          <Instagram className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
          About Instagram Follower Tracker
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          A privacy-first tool to analyze your Instagram relationships without compromising your account security.
        </p>
      </div>

      {/* What We Do */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">What We Do</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Instagram Follower Tracker helps you understand your Instagram relationships by analyzing your official Instagram data export.
          We help you identify who follows you back, who doesn't, and track changes over time—all without ever asking for your Instagram password.
        </p>
        <p className="text-gray-600 dark:text-gray-400">
          Our tool processes your data entirely in your browser for initial analysis, ensuring maximum privacy. You can optionally save results
          to your account for historical tracking and snapshot comparisons.
        </p>
      </div>

      {/* Key Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <Shield className="w-10 h-10 text-green-600 dark:text-green-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Password Required
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            We never ask for your Instagram password. You simply upload Instagram's official data export ZIP file.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <Eye className="w-10 h-10 text-blue-600 dark:text-blue-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Privacy First
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Your data is processed in your browser. We only store derived analysis results if you explicitly choose to save them.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <Database className="w-10 h-10 text-purple-600 dark:text-purple-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Snapshot Comparisons
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Save multiple snapshots over time to track who unfollowed you, new followers, and relationship changes.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <Zap className="w-10 h-10 text-orange-600 dark:text-orange-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Fast & Free
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            No signup required for basic analysis. Create an account only if you want to save your analysis history.
          </p>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">How It Works</h2>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                Request Your Instagram Data
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                Go to Instagram Settings → Security → Download Your Information and request your data export in JSON format.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                Upload Your ZIP File
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                Once Instagram sends you the ZIP file (usually within 48 hours), upload it to our tool.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
              3
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                Analyze Your Relationships
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                We process your data to show mutual followers, people who don't follow back, and accounts you recently unfollowed.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
              4
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                Track Changes Over Time (Optional)
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                Create an account to save snapshots and compare them later to see who unfollowed you between exports.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Why We Built This */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-8 mb-8 border border-purple-200 dark:border-purple-800">
        <div className="flex items-start gap-4">
          <Heart className="w-10 h-10 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-1" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Why We Built This</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              We were frustrated by tools that ask for Instagram passwords or use risky automation that can get your account banned.
              Instagram provides an official data export feature, but the files are hard to understand on their own.
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              We built this tool to make your Instagram data useful and actionable—without compromising your account security or privacy.
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center">
        <Link
          to="/"
          className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
        >
          Get Started
        </Link>
      </div>
    </div>
  );
}
