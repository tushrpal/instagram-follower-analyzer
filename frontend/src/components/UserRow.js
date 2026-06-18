import React, { useState, useEffect, useRef } from "react";
import { ExternalLink, StickyNote, X, Tag } from "lucide-react";
import axios from "axios";

export function UserRow({ username, href }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const popoverRef = useRef(null);

  const profileUrl = href || `https://www.instagram.com/${username}/`;

  const loadAnnotation = async () => {
    if (loaded) return;
    try {
      const res = await axios.get(`/api/annotations/${encodeURIComponent(username)}`);
      setNote(res.data.note || "");
      setTags(res.data.tags || []);
      setLoaded(true);
    } catch {
      setLoaded(true);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    loadAnnotation();
  };

  const save = async () => {
    setSaving(true);
    try {
      await axios.put(`/api/annotations/${encodeURIComponent(username)}`, { note, tags });
    } catch {
      // silent — annotation is best-effort
    } finally {
      setSaving(false);
      setOpen(false);
    }
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags((prev) => [...prev, t]);
    }
    setTagInput("");
  };

  const removeTag = (tag) => setTags((prev) => prev.filter((t) => t !== tag));

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        save();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, note, tags]);

  return (
    <div className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg group">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-bold">
            {username.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="min-w-0">
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-gray-900 dark:text-gray-200 hover:text-purple-600 dark:hover:text-purple-400 flex items-center gap-1"
          >
            @{username}
            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
          </a>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-0.5">
              {tags.map((t) => (
                <span
                  key={t}
                  className="text-xs px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
          {note && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{note}</p>
          )}
        </div>
      </div>

      <div className="relative flex-shrink-0 ml-2">
        <button
          onClick={handleOpen}
          title="Add note / tags"
          className="p-1.5 rounded text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <StickyNote className="w-4 h-4" />
        </button>

        {open && (
          <div
            ref={popoverRef}
            className="absolute right-0 top-8 z-50 w-72 bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-xl shadow-xl p-4"
          >
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
              @{username}
            </p>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note…"
              rows={3}
              maxLength={500}
              className="w-full text-sm border dark:border-gray-600 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-purple-400 dark:bg-gray-700 dark:text-gray-200 mb-3"
            />

            <div className="flex flex-wrap gap-1 mb-2">
              {tags.map((t) => (
                <span
                  key={t}
                  className="flex items-center gap-1 text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded"
                >
                  {t}
                  <button onClick={() => removeTag(t)} className="hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2 mb-3">
              <div className="flex items-center gap-1 flex-1 border dark:border-gray-600 rounded-lg px-2">
                <Tag className="w-3 h-3 text-gray-400" />
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }}
                  placeholder="Add tag, press Enter"
                  className="text-sm flex-1 py-1.5 focus:outline-none dark:bg-transparent dark:text-gray-200"
                  maxLength={50}
                />
              </div>
              <button
                onClick={addTag}
                className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
              >
                Add
              </button>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="text-xs px-3 py-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="text-xs px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
