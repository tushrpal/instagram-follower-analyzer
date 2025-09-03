import React from 'react';
import { Heart, Shield, Lock } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-white border-t mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-6 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start space-x-2">
            <Heart className="w-5 h-5 text-red-500" />
            <span className="text-gray-600">Made with love for Instagram users</span>
          </div>
          
          <div className="flex items-center justify-center space-x-2">
            <Shield className="w-5 h-5 text-green-500" />
            <span className="text-gray-600">Privacy-focused & secure</span>
          </div>
          
          <div className="flex items-center justify-center md:justify-end space-x-2">
            <Lock className="w-5 h-5 text-blue-500" />
            <span className="text-gray-600">Data processed locally</span>
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t text-center text-gray-500 text-sm">
          <p>© 2024 Instagram Follower Analyzer. This tool is not affiliated with Instagram.</p>
        </div>
      </div>
    </footer>
  );
}