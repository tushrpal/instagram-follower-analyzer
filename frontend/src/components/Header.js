import React from 'react';
import { Instagram, Github } from 'lucide-react';

export function Header() {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
              <Instagram className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Instagram Follower Analyzer</h1>
              <p className="text-sm text-gray-600">Analyze your follower relationships</p>
            </div>
          </div>
          
          <a
            href="https://github.com/tushrpal0/instagram-follower-analyzer"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <Github className="w-5 h-5" />
            <span className="hidden md:inline">View on GitHub</span>
          </a>
        </div>
      </div>
    </header>
  );
}