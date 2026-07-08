import React, { useState, useEffect } from "react";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import {
  Upload as UploadIcon,
  FileText,
  AlertCircle,
  CheckCircle,
  Play,
  Download,
  X,
  ExternalLink,
} from "lucide-react";
import axios from "axios";

const INSTAGRAM_EXPORT_URL =
  "https://accountscenter.instagram.com/info_and_permissions/dyi/";
const INSTAGRAM_EXPORT_URL =
  "https://accountscenter.instagram.com/info_and_permissions/dyi/";

function DownloadGuideModal({ onClose }) {
  const steps = [
    { num: 1, text: 'Click "Create new export"' },
    { num: 2, text: 'Choose "Export to this device"' },
    {
      num: 3,
      text: 'Click "Customize information" → unselect all → select only "Followers and Following"',
    },
    {
      num: 3,
      text: 'Click "Customize information" → unselect all → select only "Followers and Following"',
    },
    { num: 4, text: 'Set date range to "All time"' },
    { num: 5, text: "Select format: JSON (not HTML)" },
    { num: 5, text: "Select format: JSON (not HTML)" },
    { num: 6, text: 'Click "Export" and wait 10–20 minutes' },
    { num: 7, text: "Come back to this page and download the file when ready" },
  ];

  const handleOpen = () => {
    window.open(INSTAGRAM_EXPORT_URL, "_blank", "noopener,noreferrer");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 z-10">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Download className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              What to do on Instagram
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Follow these steps after the site opens
            </p>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              What to do on Instagram
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Follow these steps after the site opens
            </p>
          </div>
        </div>

        {/* Steps */}
        <ol className="space-y-3 mb-6">
          {steps.map((s) => (
            <li key={s.num} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {s.num}
              </span>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {s.text}
              </span>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {s.text}
              </span>
            </li>
          ))}
        </ol>

        <p className="text-xs text-gray-500 dark:text-gray-400 mb-5 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
          💡 Instagram takes <strong>10–20 minutes</strong> to prepare the file.
          Come back here once it's downloaded and upload the ZIP.
          💡 Instagram takes <strong>10–20 minutes</strong> to prepare the file.
          Come back here once it's downloaded and upload the ZIP.
        </p>

        {/* CTA */}
        <button
          onClick={handleOpen}
          className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg"
        >
          <ExternalLink className="w-4 h-4" />
          Open Instagram Data Page
        </button>
      </div>
    </div>
  );
}

export function Upload() {
  const [processing, setProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [error, setError] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const navigate = useNavigate();

  // Add SEO Schema markup for Google Search Console
  useEffect(() => {
    // 1. Update meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.name = "description";
      document.head.appendChild(metaDesc);
    }
    metaDesc.content =
      "Upload your Instagram data export to instantly see who unfollowed you, find non-followers, and analyze mutual followers — free, no password required, works for private accounts.";

    // Update page title
    document.title =
      "Upload Instagram Data - Free Follower Tracker | IAnalyser";

    // 2. Video Schema
    const videoSchema = {
      "@context": "https://schema.org",
      "@type": "VideoObject",
      name: "How to Download Instagram Data Export",
      description:
        "Step-by-step video guide showing how to download your Instagram data export and use it with the follower tracker",
      thumbnailUrl: "https://img.youtube.com/vi/JwBRvOBlCJc/maxresdefault.jpg",
      uploadDate: "2024-01-01",
      duration: "PT5M",
      contentUrl: "https://www.youtube.com/embed/JwBRvOBlCJc",
      embedUrl: "https://www.youtube-nocookie.com/embed/JwBRvOBlCJc",
    };

    // 3. FAQ Schema from Instructions section
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Do I need to give my Instagram password to use this tracker?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "No. You never enter your Instagram password. You simply download your data export from Instagram's official settings page and upload the ZIP file here. Everything is analyzed locally in your browser.",
          },
        },
        {
          "@type": "Question",
          name: "How long does it take to download my Instagram data?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Instagram typically takes 10-20 minutes to prepare your data export file. After requesting, you'll receive a notification when it's ready for download. Then upload the ZIP file to our tool for instant analysis.",
          },
        },
        {
          "@type": "Question",
          name: "Does this work for private Instagram accounts?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, completely. Since you're uploading your own data export, the tool works perfectly for private accounts. Your privacy settings don't matter because the data comes directly from your account to our analyzer.",
          },
        },
        {
          "@type": "Question",
          name: "Will Instagram ban my account for using this tracker?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "No. This tool never interacts with Instagram's servers. You download your own data and analyze it locally. There's zero risk of account suspension, unlike third-party apps that require your login credentials.",
          },
        },
        {
          "@type": "Question",
          name: "What information do I need to select when exporting my data?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Select only 'Followers and Following' from the customization options when requesting your export. You can deselect everything else. Choose JSON format and 'All time' for the date range to get complete follower history.",
          },
        },
      ],
    };

    // 4. Breadcrumb Schema
    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: window.location.origin,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Upload",
          item: `${window.location.origin}/upload`,
        },
      ],
    };

    // Create and append schema scripts
    const schemas = [videoSchema, faqSchema, breadcrumbSchema];
    const scripts = [];

    schemas.forEach((schema) => {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.text = JSON.stringify(schema);
      document.head.appendChild(script);
      scripts.push(script);
    });

    // Cleanup on unmount
    return () => {
      scripts.forEach((script) => {
        if (script.parentNode === document.head) {
          document.head.removeChild(script);
        }
      });
    };
  }, []);

  const onDrop = async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".zip")) {
      setError(
        "Please upload a ZIP file containing your Instagram data export.",
      );
      setError(
        "Please upload a ZIP file containing your Instagram data export.",
      );
      return;
    }

    setError(null);
    setProcessing(true);

    try {
      const { parseAndAnalyzeZip } = await import("../utils/browserAnalyzer");
      const result = await parseAndAnalyzeZip(file, setProgressMsg);

      // Generate a session ID locally
      const sessionId = crypto.randomUUID();

      // Store full analysis in sessionStorage for the dashboard
      sessionStorage.setItem(`session_${sessionId}`, JSON.stringify(result));

      // Save full data to backend so all pages (timeline, unfollow, etc.) work
      await axios.post("/api/sessions", {
        sessionId,
        summary: result.summary,
        mutual: result.mutual,
        followersOnly: result.followersOnly,
        followingOnly: result.followingOnly,
        pendingRequests: result.pendingRequests,
        unfollowedProfiles: result.unfollowedProfiles,
        relationshipProfiles: result.relationshipProfiles,
      });

      navigate(`/dashboard/${sessionId}`);
    } catch (err) {
      console.error("Analysis error:", err);
      setError(
        err.message ||
          "Failed to process your Instagram data. Please try again.",
      );
      setError(
        err.message ||
          "Failed to process your Instagram data. Please try again.",
      );
    } finally {
      setProcessing(false);
      setProgressMsg("");
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/zip": [".zip"],
      "application/x-zip-compressed": [".zip"],
    },
    multiple: false,
    disabled: processing,
  });

  return (
    <div className="max-w-4xl mx-auto">
      {showGuide && <DownloadGuideModal onClose={() => setShowGuide(false)} />}

      {/* Hero Section */}
      <div className="text-center mb-8 sm:mb-12">
        <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
          Instagram Follower
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
            {" "}
            Tracker
          </span>
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-4 sm:mb-6">
          See who unfollowed you, find accounts that don't follow back, and
          analyse your mutual followers — using your official Instagram data
          export. No login, no password.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-gray-500 dark:text-gray-400 mb-6 sm:mb-8">
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-green-500" /> No password
            required
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-green-500" /> Works for private
            accounts
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-green-500" /> Free, no signup
            needed
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-green-500" /> Runs in your
            browser
          </span>
        </div>
        <button
          onClick={() => setShowGuide(true)}
          className="inline-flex items-center gap-2 px-5 sm:px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold text-base sm:text-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
        >
          <Download className="w-5 h-5" />
          Download Instagram Data
        </button>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
          Don't have the file yet? Download it from Instagram first.
        </p>
      </div>

      {/* Upload Area */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 sm:p-8 mb-8">
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-xl p-6 sm:p-12 text-center cursor-pointer
            transition-all duration-300 ease-in-out
            ${
              isDragActive
                ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                : "border-gray-300 dark:border-gray-600 hover:border-purple-400 hover:bg-gray-50 dark:hover:bg-gray-700/50"
            }
            ${processing ? "pointer-events-none opacity-50" : ""}
          `}
        >
          <input {...getInputProps()} />

          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <UploadIcon className="w-8 h-8 text-white" />
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {processing
                  ? "Analyzing your data..."
                  : "Upload Instagram Data Export"}
                {processing
                  ? "Analyzing your data..."
                  : "Upload Instagram Data Export"}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {isDragActive
                  ? "Drop your ZIP file here..."
                  : "Drag & drop your Instagram export ZIP file or click to browse"}
              </p>
            </div>

            {processing && (
              <div className="w-full max-w-md text-center">
                <div className="spinner mb-2 mx-auto"></div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {progressMsg || "Processing…"}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {progressMsg || "Processing…"}
                </p>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}
      </div>

      {/* How It Works — 60 second flow */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">
          How It Works in 60 Seconds
        </h2>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-8 max-w-xl mx-auto">
          Three steps to a complete Instagram follower analysis. No login, no
          app, no password.
        </p>
        <div className="grid sm:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xl font-bold flex items-center justify-center mx-auto mb-3">
              1
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Download your data
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Request a "Followers and following" export from Instagram's
              official Download Your Information page. Takes 10–20 minutes.
            </p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xl font-bold flex items-center justify-center mx-auto mb-3">
              2
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Upload the ZIP
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Drag and drop the ZIP file into the upload box above. Files are
              processed instantly and never stored on our servers.
            </p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xl font-bold flex items-center justify-center mx-auto mb-3">
              3
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              See your dashboard
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              View unfollowers, non-followers, mutual followers, pending
              requests, and full follower analytics — all in one place.
            </p>
          </div>
        </div>
      </div>

      {/* Comparison vs other trackers */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8 mb-8 overflow-x-auto">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">
          Why This Beats Other Instagram Trackers
        </h2>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-6 max-w-2xl mx-auto">
          Most Instagram follower trackers ask for your password or only show
          partial data. Here's how we compare to typical alternatives.
        </p>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b dark:border-gray-700">
              <th className="py-3 pr-4 font-semibold text-gray-900 dark:text-white">
                Feature
              </th>
              <th className="py-3 px-4 font-semibold text-purple-600 dark:text-purple-400 text-center">
                InstaFollowTracker
              </th>
              <th className="py-3 px-4 font-semibold text-gray-500 dark:text-gray-400 text-center">
                Password-based apps
              </th>
              <th className="py-3 pl-4 font-semibold text-gray-500 dark:text-gray-400 text-center">
                Chrome extensions
              </th>
            </tr>
          </thead>
          <tbody className="text-gray-700 dark:text-gray-300">
            <tr className="border-b dark:border-gray-700">
              <td className="py-3 pr-4">No Instagram password required</td>
              <td className="py-3 px-4 text-center text-green-600 dark:text-green-400 font-semibold">
                Yes
              </td>
              <td className="py-3 px-4 text-center text-red-500">No</td>
              <td className="py-3 pl-4 text-center text-red-500">No</td>
            </tr>
            <tr className="border-b dark:border-gray-700">
              <td className="py-3 pr-4">Works for private accounts</td>
              <td className="py-3 px-4 text-center text-green-600 dark:text-green-400 font-semibold">
                Yes
              </td>
              <td className="py-3 px-4 text-center text-gray-400">Sometimes</td>
              <td className="py-3 pl-4 text-center text-red-500">No</td>
            </tr>
            <tr className="border-b dark:border-gray-700">
              <td className="py-3 pr-4">Zero risk of Instagram ban</td>
              <td className="py-3 px-4 text-center text-green-600 dark:text-green-400 font-semibold">
                Yes
              </td>
              <td className="py-3 px-4 text-center text-red-500">No</td>
              <td className="py-3 pl-4 text-center text-red-500">No</td>
            </tr>
            <tr className="border-b dark:border-gray-700">
              <td className="py-3 pr-4">100% accurate follower data</td>
              <td className="py-3 px-4 text-center text-green-600 dark:text-green-400 font-semibold">
                Yes
              </td>
              <td className="py-3 px-4 text-center text-gray-400">
                Rate-limited
              </td>
              <td className="py-3 pl-4 text-center text-gray-400">
                Rate-limited
              </td>
            </tr>
            <tr className="border-b dark:border-gray-700">
              <td className="py-3 pr-4">Compare dated snapshots</td>
              <td className="py-3 px-4 text-center text-green-600 dark:text-green-400 font-semibold">
                Yes
              </td>
              <td className="py-3 px-4 text-center text-gray-400">
                Only after long use
              </td>
              <td className="py-3 pl-4 text-center text-gray-400">
                Only after long use
              </td>
            </tr>
            <tr className="border-b dark:border-gray-700">
              <td className="py-3 pr-4">Free with all features</td>
              <td className="py-3 px-4 text-center text-green-600 dark:text-green-400 font-semibold">
                Yes
              </td>
              <td className="py-3 px-4 text-center text-red-500">Paywall</td>
              <td className="py-3 pl-4 text-center text-red-500">Paywall</td>
            </tr>
            <tr className="border-b dark:border-gray-700">
              <td className="py-3 pr-4">No install or extension required</td>
              <td className="py-3 px-4 text-center text-green-600 dark:text-green-400 font-semibold">
                Yes
              </td>
              <td className="py-3 px-4 text-center text-red-500">
                App download
              </td>
              <td className="py-3 pl-4 text-center text-red-500">
                Extension install
              </td>
            </tr>
            <tr>
              <td className="py-3 pr-4">CSV export</td>
              <td className="py-3 px-4 text-center text-green-600 dark:text-green-400 font-semibold">
                Yes
              </td>
              <td className="py-3 px-4 text-center text-gray-400">
                Sometimes paid
              </td>
              <td className="py-3 pl-4 text-center text-gray-400">
                Sometimes paid
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Video Tutorial Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-8">
        <div className="flex items-center mb-6">
          <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-red-600 rounded-lg flex items-center justify-center mr-3">
            <Play className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            🎥 Video Tutorial: How to Download Your Instagram Data
          </h2>
        </div>

        <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-6">
          <p className="text-red-800 dark:text-red-300 font-medium mb-4">
            📺 Watch this step-by-step video guide to learn how to download your
            Instagram data export:
          </p>

          <div className="relative aspect-video rounded-lg overflow-hidden shadow-lg">
            <iframe
              src="https://www.youtube-nocookie.com/embed/JwBRvOBlCJc"
              title="How to Download Instagram Data Export"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              className="w-full h-full"
            ></iframe>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-red-700 dark:text-red-400">
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

      {/* SEO Content Section */}
      <article className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-8 prose prose-gray dark:prose-invert max-w-none">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          A safer way to analyse your Instagram followers
        </h2>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          If you've ever wondered who stopped following you or why your follower
          count quietly dropped overnight, you need a reliable{" "}
          <strong>Instagram follower tracker</strong>. Our tool gives you a
          complete picture of your Instagram audience — for free, without
          installing anything, and without handing over your Instagram password.
          If you've ever wondered who stopped following you or why your follower
          count quietly dropped overnight, you need a reliable{" "}
          <strong>Instagram follower tracker</strong>. Our tool gives you a
          complete picture of your Instagram audience — for free, without
          installing anything, and without handing over your Instagram password.
        </p>

        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
          How it works
        </h3>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          Unlike third-party apps that require your Instagram credentials, our{" "}
          <strong>Instagram follower tracker online free</strong> tool works
          differently. You simply download your own data export directly from
          Instagram — a ZIP file containing your followers and following lists
          in JSON format — and upload it here. No passwords, no OAuth tokens, no
          risk to your account. Everything is analyzed server-side in seconds
          and the raw data is deleted after processing.
          Unlike third-party apps that require your Instagram credentials, our{" "}
          <strong>Instagram follower tracker online free</strong> tool works
          differently. You simply download your own data export directly from
          Instagram — a ZIP file containing your followers and following lists
          in JSON format — and upload it here. No passwords, no OAuth tokens, no
          risk to your account. Everything is analyzed server-side in seconds
          and the raw data is deleted after processing.
        </p>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          Once uploaded, the dashboard instantly categorizes every account:
          mutual followers, people you follow who don't follow back, followers
          who you haven't followed back, and pending follow requests. You can
          search and filter across thousands of accounts, export any list to
          CSV, and leave private notes on specific profiles.
          Once uploaded, the dashboard instantly categorizes every account:
          mutual followers, people you follow who don't follow back, followers
          who you haven't followed back, and pending follow requests. You can
          search and filter across thousands of accounts, export any list to
          CSV, and leave private notes on specific profiles.
        </p>

        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
          Seeing who unfollowed you
        </h3>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          The most common reason people look for an{" "}
          <strong>Instagram follower tracker — who unfollowed me</strong> — is
          to understand audience churn. Our session comparison feature does
          exactly that. Upload a second export a week or a month later, and the
          tool compares the two snapshots side by side. It shows you a precise
          list of accounts that unfollowed you between sessions, along with
          direct profile links so you can review them instantly. No guessing, no
          approximations — just the actual data from Instagram itself.
          The most common reason people look for an{" "}
          <strong>Instagram follower tracker — who unfollowed me</strong> — is
          to understand audience churn. Our session comparison feature does
          exactly that. Upload a second export a week or a month later, and the
          tool compares the two snapshots side by side. It shows you a precise
          list of accounts that unfollowed you between sessions, along with
          direct profile links so you can review them instantly. No guessing, no
          approximations — just the actual data from Instagram itself.
        </p>

        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
          Works for private accounts
        </h3>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          Most <strong>Instagram follower tracker apps</strong> fail for private
          accounts because they rely on scraping public profile pages or
          Instagram's API, neither of which exposes follower data for private
          accounts. Our approach is fundamentally different. Because you're
          working with your own downloaded data export, it works perfectly as an{" "}
          <strong>Instagram follower tracker for private accounts</strong> —
          your privacy settings are irrelevant. The data comes straight from
          Instagram to your device to our analyzer, nothing more.
          Most <strong>Instagram follower tracker apps</strong> fail for private
          accounts because they rely on scraping public profile pages or
          Instagram's API, neither of which exposes follower data for private
          accounts. Our approach is fundamentally different. Because you're
          working with your own downloaded data export, it works perfectly as an{" "}
          <strong>Instagram follower tracker for private accounts</strong> —
          your privacy settings are irrelevant. The data comes straight from
          Instagram to your device to our analyzer, nothing more.
        </p>

        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
          Tracking changes over time
        </h3>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          Want to monitor your growth over time? Our{" "}
          <strong>Instagram follower tracker live</strong> session history lets
          you build up a timeline by uploading new exports regularly. Each
          session is saved under a custom name you choose, and the dashboard
          charts your follower and following counts over time using a growth
          timeline. You can compare any two sessions to see exactly what changed
          — who came in, who left, and how your mutual follower ratio shifted.
          Want to monitor your growth over time? Our{" "}
          <strong>Instagram follower tracker live</strong> session history lets
          you build up a timeline by uploading new exports regularly. Each
          session is saved under a custom name you choose, and the dashboard
          charts your follower and following counts over time using a growth
          timeline. You can compare any two sessions to see exactly what changed
          — who came in, who left, and how your mutual follower ratio shifted.
        </p>

        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
          Read more
        </h3>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          There are plenty of paid tools and sketchy apps that ask for your
          password. What makes this the{" "}
          <strong>best free Instagram follower tracker app</strong> is the
          combination of depth, safety, and zero cost. You get eight different
          relationship list types, cross-session comparison, a batch unfollow
          helper, search and pagination, CSV exports, private account
          compatibility, and full dark mode — completely free. There's no
          premium tier hiding the important features, no account required to get
          started, and no app to download. It runs entirely in your browser.
          There are plenty of paid tools and sketchy apps that ask for your
          password. What makes this the{" "}
          <strong>best free Instagram follower tracker app</strong> is the
          combination of depth, safety, and zero cost. You get eight different
          relationship list types, cross-session comparison, a batch unfollow
          helper, search and pagination, CSV exports, private account
          compatibility, and full dark mode — completely free. There's no
          premium tier hiding the important features, no account required to get
          started, and no app to download. It runs entirely in your browser.
        </p>
        <p className="text-gray-700 dark:text-gray-300 mb-2">
          Whether you're a creator tracking audience loyalty, a brand monitoring
          follower quality, or just curious who quietly unfollowed you, this{" "}
          <strong>best Instagram follower tracker app</strong> gives you the
          data you need in under a minute. Upload your Instagram data export
          above to get started.
          Whether you're a creator tracking audience loyalty, a brand monitoring
          follower quality, or just curious who quietly unfollowed you, this{" "}
          <strong>best Instagram follower tracker app</strong> gives you the
          data you need in under a minute. Upload your Instagram data export
          above to get started.
        </p>
        <ul className="space-y-2 mb-2 not-prose">
          <li>
            <a
              href="/blog/"
              className="text-purple-600 dark:text-purple-400 hover:underline"
            >
              All guides and articles
            </a>
          </li>
          <li>
            <a
              href="/blog/why-people-unfollow-on-instagram/"
              className="text-purple-600 dark:text-purple-400 hover:underline"
            >
              Why people actually unfollow on Instagram
            </a>
          </li>
          <li>
            <a
              href="/blog/grow-instagram-following-organically/"
              className="text-purple-600 dark:text-purple-400 hover:underline"
            >
              How to grow your Instagram following organically
            </a>
          </li>
          <li>
            <a
              href="/blog/instagram-analytics-creator-guide/"
              className="text-purple-600 dark:text-purple-400 hover:underline"
            >
              A creator's guide to reading Instagram analytics
            </a>
          </li>
          <li>
            <a
              href="/who-unfollowed-me/"
              className="text-purple-600 dark:text-purple-400 hover:underline"
            >
              Who unfollowed me on Instagram — complete guide
            </a>
          </li>
          <li>
            <a
              href="/instagram-non-followers/"
              className="text-purple-600 dark:text-purple-400 hover:underline"
            >
              People who don't follow you back on Instagram
            </a>
          </li>
          <li>
            <a
              href="/instagram-follower-tracker-private-account/"
              className="text-purple-600 dark:text-purple-400 hover:underline"
            >
              Tracker for private accounts
            </a>
          </li>
          <li>
            <a
              href="/how-to-download-instagram-data/"
              className="text-purple-600 dark:text-purple-400 hover:underline"
            >
              How to download your Instagram data
            </a>
          </li>
        </ul>
      </article>

      {/* Instructions */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
        <div className="flex items-center mb-6">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center mr-3">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
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
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Open the link
              </h3>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-2">
              Go to 👉{" "}
              <a
                href="https://accountscenter.instagram.com/info_and_permissions/dyi/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline font-medium"
              >
                Instagram Data Export Page
              </a>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 italic">
              (Make sure you're logged into the correct Instagram account)
            </p>
          </div>

          {/* Step 2 */}
          <div className="border-l-4 border-purple-500 pl-6 py-4">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mr-3">
                <span className="text-sm font-bold text-white">2</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Create a New Export
              </h3>
            </div>
            <p className="text-gray-700 dark:text-gray-300">
              Click on <span className="font-semibold">Create new export</span>.
            </p>
          </div>

          {/* Step 3 */}
          <div className="border-l-4 border-purple-500 pl-6 py-4">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mr-3">
                <span className="text-sm font-bold text-white">3</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Choose Export Location
              </h3>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-2">
              Select{" "}
              <span className="font-semibold">Export to this device</span>.
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 italic">
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
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Customize Information
              </h3>
            </div>
            <div className="space-y-2">
              <p className="text-gray-700 dark:text-gray-300">
                Click on{" "}
                <span className="font-semibold">Customize information</span>.
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                Unselect all options.
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                Unselect all options.
              </p>
              <p className="text-gray-700 dark:text-gray-300">
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
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Select Date Range
              </h3>
            </div>
            <div className="space-y-2">
              <p className="text-gray-700 dark:text-gray-300">
                If you want data for all time → choose{" "}
                <span className="font-semibold">All time</span>.
              </p>
              <p className="text-gray-700 dark:text-gray-300">
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
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Choose File Format
              </h3>
            </div>
            <p className="text-gray-700 dark:text-gray-300">
              Select <span className="font-semibold">JSON</span> (not HTML).
            </p>
          </div>

          {/* Step 7 */}
          <div className="border-l-4 border-purple-500 pl-6 py-4">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mr-3">
                <span className="text-sm font-bold text-white">7</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Start Export
              </h3>
            </div>
            <p className="text-gray-700 dark:text-gray-300">
              Click on <span className="font-semibold">Export</span>.
            </p>
          </div>

          {/* Step 8 */}
          <div className="border-l-4 border-orange-500 pl-6 py-4">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center mr-3">
                <span className="text-sm font-bold text-white">8</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Wait for Processing
              </h3>
            </div>
            <div className="space-y-2">
              <p className="text-gray-700 dark:text-gray-300">
                Instagram will prepare your file.
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                Instagram will prepare your file.
              </p>
              <p className="text-gray-700 dark:text-gray-300">
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
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Download the File
              </h3>
            </div>
            <div className="space-y-2">
              <p className="text-gray-700 dark:text-gray-300">
                Come back to the same link after 10–20 min.
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                You will see your export ready for download.
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                Click <span className="font-semibold">Download</span> → it will
                save the file directly to your device.
              </p>
            </div>
          </div>
        </div>

        {/* Privacy Section */}
        <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-blue-800 dark:text-blue-300 font-semibold text-lg mb-2">
                🔒 Privacy First
              </p>
              <p className="text-blue-700 dark:text-blue-400">
                Your data is processed locally and automatically deleted after
                analysis. We never store your personal information or follower
                data on our servers.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Summary */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
            📋 Quick Summary
          </h4>
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
            📋 Quick Summary
          </h4>
          <p className="text-sm text-gray-700 dark:text-gray-300">
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
