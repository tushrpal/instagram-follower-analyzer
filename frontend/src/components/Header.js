import React, { useState, useEffect } from "react";
import { Instagram, Linkedin, Moon, Sun, LogOut, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Header() {
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem("theme") === "dark";
    } catch {
      return false;
    }
  });
  const auth = useAuth();
  const user = auth?.user;


  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm border-b dark:border-gray-700">
      <div className="container mx-auto px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2">
          <Link
            to="/"
            className="flex items-center space-x-2 sm:space-x-3 min-w-0"
            aria-label="Instagram Follower Tracker — Home"
          >
            <div
              className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px' }}
            >
              <Instagram className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0" style={{ minHeight: '40px' }}>
              <span
                className="text-base sm:text-xl font-bold text-gray-900 dark:text-white leading-tight truncate block"
                style={{ lineHeight: '1.2' }}
              >
                Instagram Follower Tracker
              </span>
              <span
                className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 hidden sm:block"
                style={{ lineHeight: '1.4' }}
              >
                Analyze exports without your Instagram password
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setDark((d) => !d)}
              aria-label="Toggle dark mode"
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {dark ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>

            <div className="flex items-center gap-2" style={{ minWidth: '180px', minHeight: '36px' }}>
              {user ? (
                <>
                  <Link
                    to="/account"
                    title="My Account"
                    className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                  >
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline">My Account</span>
                  </Link>
                  <button
                    onClick={() => auth.logout()}
                    title="Sign out"
                    className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Sign out</span>
                  </button>
                </>
              ) : user === null ? (
                <>
                  <Link
                    to="/login"
                    className="text-sm text-purple-600 hover:text-purple-700 font-medium whitespace-nowrap"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    className="text-sm px-2 sm:px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors whitespace-nowrap"
                  >
                    Register
                  </Link>
                </>
              ) : null}
            </div>

            <nav className="hidden lg:flex items-center gap-1">
              <Link
                to="/about"
                aria-label="About page"
                className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
              >
                About
              </Link>
              <Link
                to="/contact"
                aria-label="Contact page"
                className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
              >
                Contact
              </Link>
            </nav>

            <a
              href="https://www.linkedin.com/in/tushrpal"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit LinkedIn profile"
              className="hidden md:flex items-center space-x-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
            >
              <Linkedin className="w-5 h-5" />
              <span className="text-sm">LinkedIn</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
