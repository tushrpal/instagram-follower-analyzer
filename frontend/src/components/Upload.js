import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { Upload as UploadIcon, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import axios from 'axios';

export function Upload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const onDrop = async (acceptedFiles) => {
    const file = acceptedFiles[0];
    
    if (!file) return;
    
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setError('Please upload a ZIP file containing your Instagram data export.');
      return;
    }

    setError(null);
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('instagramData', file);

    try {
      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setProgress(percentCompleted);
        },
      });

      if (response.data.sessionId) {
        navigate(`/dashboard/${response.data.sessionId}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError(
        error.response?.data?.error || 
        'Failed to process your Instagram data. Please try again.'
      );
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/zip': ['.zip'],
      'application/x-zip-compressed': ['.zip']
    },
    multiple: false,
    disabled: uploading
  });

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
          Instagram Follower
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
            {' '}Analyzer
          </span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Discover who follows you back, who doesn't, and gain insights into your Instagram connections.
        </p>
      </div>

      {/* Upload Area */}
      <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
            transition-all duration-300 ease-in-out
            ${isDragActive 
              ? 'border-purple-500 bg-purple-50' 
              : 'border-gray-300 hover:border-purple-400 hover:bg-gray-50'
            }
            ${uploading ? 'pointer-events-none opacity-50' : ''}
          `}
        >
          <input {...getInputProps()} />
          
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <UploadIcon className="w-8 h-8 text-white" />
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {uploading ? 'Processing your data...' : 'Upload Instagram Data Export'}
              </h3>
              <p className="text-gray-600">
                {isDragActive
                  ? 'Drop your ZIP file here...'
                  : 'Drag & drop your Instagram export ZIP file or click to browse'
                }
              </p>
            </div>
            
            {uploading && (
              <div className="w-full max-w-md">
                <div className="bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600">{progress}% complete</p>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">How to Get Your Instagram Data</h2>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center p-6 bg-gray-50 rounded-xl">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-xl font-bold text-purple-600">1</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Request Data</h3>
            <p className="text-gray-600 text-sm">
              Go to Instagram Settings → Security → Download Data and request your information.
            </p>
          </div>
          
          <div className="text-center p-6 bg-gray-50 rounded-xl">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-xl font-bold text-purple-600">2</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Download ZIP</h3>
            <p className="text-gray-600 text-sm">
              Instagram will email you a download link when your data is ready (usually within 48 hours).
            </p>
          </div>
          
          <div className="text-center p-6 bg-gray-50 rounded-xl">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-xl font-bold text-purple-600">3</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Upload & Analyze</h3>
            <p className="text-gray-600 text-sm">
              Upload your ZIP file here and get instant insights into your follower relationships.
            </p>
          </div>
        </div>

        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start space-x-3">
          <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-blue-800 font-medium">Privacy First</p>
            <p className="text-blue-700 text-sm">
              Your data is processed locally and automatically deleted after analysis. We never store your personal information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}