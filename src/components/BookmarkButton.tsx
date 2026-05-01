"use client";

import { useState, useRef, useEffect } from "react";
import { Bookmark } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

interface BookmarkButtonProps {
  eventId: string;
  initialSaved: boolean;
  userId: string | null;
  onToggle?: (saved: boolean) => void;
}

export default function BookmarkButton({ eventId, initialSaved, userId, onToggle }: BookmarkButtonProps) {
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);
  const [showPopover, setShowPopover] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSaved(initialSaved);
  }, [initialSaved]);

  useEffect(() => {
    if (!showPopover) return;
    function handleMouseDown(e: MouseEvent) {
      if (
        buttonRef.current && !buttonRef.current.contains(e.target as Node) &&
        popoverRef.current && !popoverRef.current.contains(e.target as Node)
      ) {
        setShowPopover(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [showPopover]);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!userId) {
      setShowPopover(prev => !prev);
      return;
    }

    setLoading(true);
    const nextSaved = !saved;
    setSaved(nextSaved);
    onToggle?.(nextSaved);

    if (nextSaved) {
      await supabase.from("saved_events").insert({ user_id: userId, event_id: eventId });
    } else {
      await supabase.from("saved_events").delete().eq("user_id", userId).eq("event_id", eventId);
    }

    setLoading(false);
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleClick}
        disabled={loading}
        aria-label={saved ? "Unsave event" : "Save event"}
        className="p-1.5 rounded-md text-gray-400 hover:text-[#4ea8de] transition-colors disabled:opacity-50"
      >
        <Bookmark
          size={16}
          className={saved ? "fill-current text-[#4ea8de]" : ""}
        />
      </button>

      {showPopover && (
        <div
          ref={popoverRef}
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm whitespace-nowrap"
        >
          <p className="text-gray-700 mb-1">Sign in to save events</p>
          <Link
            href="/auth/signin"
            className="text-[#4ea8de] hover:text-[#3a95cc] font-medium transition-colors"
            onClick={() => setShowPopover(false)}
          >
            Sign In
          </Link>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-b border-r border-gray-200 rotate-45 -mt-1" />
        </div>
      )}
    </div>
  );
}
