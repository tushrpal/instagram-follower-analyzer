import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Users, UserCheck, UserPlus, Search, Download, AlertCircle, Loader } from 'lucide-react';
import axios from 'axios';

export function Dashboard() {
  const { sessionId } = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [users, setUsers] = useState({});
  const [activeTab, setActiveTab] = useState('mutual');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAnalysis();
  }, [sessionId]);

  useEffect(() => {
    if (activeTab && !searchQuery) {
      loadUsers(activeTab);
    }
  }, [activeTab, sessionId]);

  useEffect(() => {
    if (searchQuery) {
      handleSearch();
    } else {
      setSearchResults(null);
      if (activeTab) {
        loadUsers(activeTab);
      }
    }
  }, [searchQuery]);

  const loadAnalysis = async () => {
    try {
      const response = await axios.get(`/api/analysis/${sessionId}`);
      setAnalysis(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load analysis:', error);
      setError('Failed to load analysis results. The session may have expired.');
      setLoading(false);
    }
  };

  const loadUsers = async (category) => {
    try {
      const response = await axios.get(`/api/analysis/${sessionId}/${category}`);
      setUsers(prev => ({
        ...prev,
        [category]: response.data.users
      }));
    } catch (error) {
      console.error(`Failed to load ${category} users:`, error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      const response = await axios.get(`/api/analysis/${sessionId}/search/${searchQuery}`);
      setSearchResults(response.data);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const exportData = async (category = null) => {
    try {
      const url = category 
        ? `/api/analysis/${sessionId}/export?category=${category}`
        : `/api/analysis/${sessionId}/export`;
      
      const response = await axios.get(url, { responseType: 'blob' });
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = category 
        ? `instagram_${category}_analysis.csv`
        : 'instagram_full_analysis.csv';
      link.click();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Analysis Not Found</h2>
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
      id: 'mutual',
      label: 'Mutual Followers',
      icon: UserCheck,
      count: analysis?.summary.mutualCount || 0,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      id: 'followers_only',
      label: 'Followers Only',
      icon: Users,
      count: analysis?.summary.followersOnlyCount || 0,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      id: 'following_only',
      label: 'Following Only',
      icon: UserPlus,
      count: analysis?.summary.followingOnlyCount || 0,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    }
  ];

  const currentUsers = searchResults 
    ? searchResults.results[activeTab] || []
    : users[activeTab] || [];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Your Instagram Analysis</h1>
        <p className="text-gray-600">
          Analysis completed on {new Date(analysis.processedAt).toLocaleDateString()}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <div
              key={tab.id}
              className={`${tab.bgColor} ${tab.borderColor} border rounded-xl p-6 cursor-pointer transition-all hover:shadow-lg ${
                activeTab === tab.id ? 'ring-2 ring-purple-500' : ''
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
                {tab.id === 'mutual' && 'People who follow you and you follow back'}
                {tab.id === 'followers_only' && 'People who follow you but you don\'t follow back'}
                {tab.id === 'following_only' && 'People you follow but don\'t follow you back'}
              </p>
            </div>
          );
        })}
      </div>

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
            {searchResults ? `Search Results (${searchResults.totalFound} found)` : tabs.find(t => t.id === activeTab)?.label}
          </h2>
          <span className="text-gray-500">
            {currentUsers.length} users
          </span>
        </div>

        {currentUsers.length > 0 ? (
          <div className="grid gap-3">
            {currentUsers.map((user, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold">
                      {(user.username || '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">@{user.username}</p>
                    {searchResults && (
                      <p className="text-sm text-gray-500 capitalize">
                        {user.category.replace('_', ' ')}
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
        ) : (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchQuery ? 'No users found matching your search.' : 'No users in this category.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}