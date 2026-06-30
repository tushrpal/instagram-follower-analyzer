import React from 'react';
import { Heart, Shield, Lock } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-900 border-t dark:border-gray-700 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-6 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start space-x-2">
            <Heart className="w-5 h-5 text-red-500" />
            <span className="text-gray-600 dark:text-gray-400">Made with love for Instagram users</span>
          </div>

          <div className="flex items-center justify-center space-x-2">
            <Shield className="w-5 h-5 text-green-500" />
            <span className="text-gray-600 dark:text-gray-400">Privacy-focused &amp; secure</span>
          </div>

          <div className="flex items-center justify-center md:justify-end space-x-2">
            <Lock className="w-5 h-5 text-blue-500" />
            <span className="text-gray-600 dark:text-gray-400">Data processed locally</span>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t dark:border-gray-700">
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 text-center mb-3">Guides</h3>
            <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
              <a href="/who-unfollowed-me/" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">Who unfollowed me</a>
              <a href="/instagram-non-followers/" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">Non-followers</a>
              <a href="/instagram-follower-tracker-private-account/" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">Private account tracker</a>
              <a href="/how-to-download-instagram-data/" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">Download Instagram data</a>
            </nav>
          </div>
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
            <a href="/about" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">About Us</a>
            <a href="/contact" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">Contact Us</a>
            <a href="/privacy-policy" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">Privacy Policy</a>
            <a href="/terms" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">Terms &amp; Conditions</a>
          </nav>
          <p className="text-center text-gray-500 dark:text-gray-500 text-sm">© 2026 Instagram Follower Tracker. Not affiliated with Instagram or Meta.</p>
        </div>
      </div>
    </footer>
  );
}