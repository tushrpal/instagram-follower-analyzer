import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import {
  Upload as UploadIcon,
  FileText,
  AlertCircle,
  CheckCircle,
  Play,
} from "lucide-react";
import axios from "axios";

export function Upload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const onDrop = async (acceptedFiles) => {
    const file = acceptedFiles[0];

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".zip")) {
      setError(
        "Please upload a ZIP file containing your Instagram data export."
      );
      return;
    }

    setError(null);
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append("instagramData", file);

    try {
      const response = await axios.post("/api/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
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
      console.error("Upload error:", error);
      setError(
        error.response?.data?.error ||
          "Failed to process your Instagram data. Please try again."
      );
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/zip": [".zip"],
      "application/x-zip-compressed": [".zip"],
    },
    multiple: false,
    disabled: uploading,
  });

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
          Instagram Follower
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
            {" "}
            Analyzer
          </span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Discover who follows you back, who doesn't, and gain insights into
          your Instagram connections.
        </p>
      </div>

      {/* Upload Area */}
      <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
            transition-all duration-300 ease-in-out
            ${
              isDragActive
                ? "border-purple-500 bg-purple-50"
                : "border-gray-300 hover:border-purple-400 hover:bg-gray-50"
            }
            ${uploading ? "pointer-events-none opacity-50" : ""}
          `}
        >
          <input {...getInputProps()} />

          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <UploadIcon className="w-8 h-8 text-white" />
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {uploading
                  ? "Processing your data..."
                  : "Upload Instagram Data Export"}
              </h3>
              <p className="text-gray-600">
                {isDragActive
                  ? "Drop your ZIP file here..."
                  : "Drag & drop your Instagram export ZIP file or click to browse"}
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

      {/* Video Tutorial Section */}
      <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <div className="flex items-center mb-6">
          <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center mr-3">
            <Play className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            🎥 Video Tutorial: How to Download Your Instagram Data
          </h2>
        </div>

        <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-lg p-6 mb-6">
          <p className="text-red-800 font-medium mb-4">
            📺 Watch this step-by-step video guide to learn how to download your
            Instagram data export:
          </p>

          <div className="relative aspect-video rounded-lg overflow-hidden shadow-lg">
            <iframe
              src="https://www.youtube.com/embed/JwBRvOBlCJc"
              title="How to Download Instagram Data Export"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full"
            ></iframe>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-red-700">
              💡 This video shows the exact process step-by-step
            </p>
            <a
              href="https://youtu.be/JwBRvOBlCJc"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
            >
              <Play className="w-4 h-4" />
              <span>Watch on YouTube</span>
            </a>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="flex items-center mb-6">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center mr-3">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            📥 Step-by-Step Written Instructions
          </h2>
        </div>

        <div className="space-y-6">
          {/* Step 1 */}
          <div className="border-l-4 border-purple-500 pl-6 py-4">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mr-3">
                <span className="text-sm font-bold text-white">1</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Open the link
              </h3>
            </div>
            <p className="text-gray-700 mb-2">
              Go to 👉{" "}
              <a
                href="https://accountscenter.instagram.com/info_and_permissions/dyi/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline font-medium"
              >
                https://accountscenter.instagram.com/info_and_permissions/dyi/
              </a>
            </p>
            <p className="text-sm text-gray-600 italic">
              (Make sure you're logged into the correct Instagram account)
            </p>
          </div>

          {/* Step 2 */}
          <div className="border-l-4 border-purple-500 pl-6 py-4">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mr-3">
                <span className="text-sm font-bold text-white">2</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Create a New Export
              </h3>
            </div>
            <p className="text-gray-700">
              Click on <span className="font-semibold">Create new export</span>.
            </p>
          </div>

          {/* Step 3 */}
          <div className="border-l-4 border-purple-500 pl-6 py-4">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mr-3">
                <span className="text-sm font-bold text-white">3</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Choose Export Location
              </h3>
            </div>
            <p className="text-gray-700 mb-2">
              Select{" "}
              <span className="font-semibold">Export to this device</span>.
            </p>
            <p className="text-sm text-gray-600 italic">
              (Don't choose Google Drive or any external service if you want it
              directly on your device)
            </p>
          </div>

          {/* Step 4 */}
          <div className="border-l-4 border-purple-500 pl-6 py-4">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mr-3">
                <span className="text-sm font-bold text-white">4</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Customize Information
              </h3>
            </div>
            <div className="space-y-2">
              <p className="text-gray-700">
                Click on{" "}
                <span className="font-semibold">Customize information</span>.
              </p>
              <p className="text-gray-700">Unselect all options.</p>
              <p className="text-gray-700">
                Only select:{" "}
                <span className="font-semibold text-green-600">
                  ✅ Followers and Following
                </span>
                .
              </p>
            </div>
          </div>

          {/* Step 5 */}
          <div className="border-l-4 border-purple-500 pl-6 py-4">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mr-3">
                <span className="text-sm font-bold text-white">5</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Select Date Range
              </h3>
            </div>
            <div className="space-y-2">
              <p className="text-gray-700">
                If you want data for all time → choose{" "}
                <span className="font-semibold">All time</span>.
              </p>
              <p className="text-gray-700">
                If you only want a specific period → set a custom date range.
              </p>
            </div>
          </div>

          {/* Step 6 */}
          <div className="border-l-4 border-purple-500 pl-6 py-4">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mr-3">
                <span className="text-sm font-bold text-white">6</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Choose File Format
              </h3>
            </div>
            <p className="text-gray-700">
              Select <span className="font-semibold">JSON</span> (not HTML).
            </p>
          </div>

          {/* Step 7 */}
          <div className="border-l-4 border-purple-500 pl-6 py-4">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mr-3">
                <span className="text-sm font-bold text-white">7</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Start Export
              </h3>
            </div>
            <p className="text-gray-700">
              Click on <span className="font-semibold">Export</span>.
            </p>
          </div>

          {/* Step 8 */}
          <div className="border-l-4 border-orange-500 pl-6 py-4">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center mr-3">
                <span className="text-sm font-bold text-white">8</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Wait for Processing
              </h3>
            </div>
            <div className="space-y-2">
              <p className="text-gray-700">Instagram will prepare your file.</p>
              <p className="text-gray-700">
                This usually takes{" "}
                <span className="font-semibold">10–20 minutes</span> (sometimes
                longer depending on account size).
              </p>
            </div>
          </div>

          {/* Step 9 */}
          <div className="border-l-4 border-green-500 pl-6 py-4">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
                <span className="text-sm font-bold text-white">9</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Download the File
              </h3>
            </div>
            <div className="space-y-2">
              <p className="text-gray-700">
                Come back to the same link after 10–20 min.
              </p>
              <p className="text-gray-700">
                You will see your export ready for download.
              </p>
              <p className="text-gray-700">
                Click <span className="font-semibold">Download</span> → it will
                save the file directly to your device.
              </p>
            </div>
          </div>
        </div>

        {/* Privacy Section */}
        <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-blue-800 font-semibold text-lg mb-2">
                🔒 Privacy First
              </p>
              <p className="text-blue-700">
                Your data is processed locally and automatically deleted after
                analysis. We never store your personal information or follower
                data on our servers.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Summary */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">📋 Quick Summary</h4>
          <p className="text-sm text-gray-700">
            1. Visit Instagram's data export page → 2. Create new export → 3.
            Export to device → 4. Select only "Followers and Following" → 5.
            Choose JSON format → 6. Wait 10-20 minutes → 7. Download and upload
            here for analysis
          </p>
        </div>
      </div>
    </div>
  );
}
