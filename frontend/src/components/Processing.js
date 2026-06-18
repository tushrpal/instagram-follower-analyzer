import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CheckCircle, AlertCircle, Loader } from "lucide-react";
import config from "../config";

const POLL_INTERVAL = 1500; // ms

export function Processing() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("connecting");
  const [errorMsg, setErrorMsg] = useState(null);
  const timerRef = useRef(null);
  const seenMessages = useRef(new Set());

  useEffect(() => {
    if (!sessionId) return;

    async function poll() {
      try {
        const res = await fetch(`${config.apiUrl}/api/upload/status/${sessionId}`, { credentials: "include" });
        if (!res.ok) throw new Error("Status check failed");
        const data = await res.json();

        if (data.message && !seenMessages.current.has(data.message)) {
          seenMessages.current.add(data.message);
          setMessages((prev) => [...prev, data.message]);
        }

        if (data.status === "done") {
          setStatus("done");
          clearInterval(timerRef.current);
          setTimeout(() => navigate(`/dashboard/${sessionId}`), 800);
          return;
        }

        if (data.status === "error") {
          setStatus("error");
          setErrorMsg(data.error || "An error occurred.");
          clearInterval(timerRef.current);
          return;
        }

        setStatus("running");
      } catch (err) {
        setStatus("error");
        setErrorMsg("Lost connection to server. Please try again.");
        clearInterval(timerRef.current);
      }
    }

    setStatus("running");
    poll();
    timerRef.current = setInterval(poll, POLL_INTERVAL);

    return () => clearInterval(timerRef.current);
  }, [sessionId]);

  return (
    <div className="max-w-xl mx-auto mt-16 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
        {status === "done" ? (
          <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
        ) : status === "error" ? (
          <AlertCircle className="w-14 h-14 text-red-500 mx-auto mb-4" />
        ) : (
          <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center">
            <Loader className="w-12 h-12 text-purple-500 animate-spin" />
          </div>
        )}

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {status === "done"
            ? "Analysis complete!"
            : status === "error"
            ? "Something went wrong"
            : "Analyzing your data…"}
        </h2>

        {status === "error" && errorMsg && (
          <p className="text-red-600 dark:text-red-400 mb-4 text-sm">{errorMsg}</p>
        )}

        {status === "error" && (
          <a
            href="/"
            className="inline-flex items-center px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
          >
            Try again
          </a>
        )}

        {messages.length > 0 && status !== "done" && (
          <div className="mt-6 text-left space-y-2 max-h-52 overflow-y-auto">
            {messages.map((msg, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <span>{msg}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400">
              <Loader className="w-4 h-4 animate-spin flex-shrink-0" />
              <span>Processing…</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
