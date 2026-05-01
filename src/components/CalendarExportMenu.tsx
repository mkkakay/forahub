"use client";

import { useState, useRef, useEffect } from "react";
import { CalendarPlus } from "lucide-react";

interface CalendarExportMenuProps {
  title: string;
  startDate: string;
  endDate: string | null;
  location: string | null;
  description: string | null;
  registrationUrl: string | null;
}

function formatGoogleDate(dateStr: string): string {
  // Strips dashes and colons: "2026-05-15T00:00:00.000Z" → "20260515T000000Z"
  return dateStr.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function formatICSDate(dateStr: string): string {
  const d = new Date(dateStr);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function nextDay(dateStr: string): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + 1);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

export default function CalendarExportMenu({
  title,
  startDate,
  endDate,
  location,
  description,
  registrationUrl,
}: CalendarExportMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  function buildGoogleUrl(): string {
    const startFormatted = formatGoogleDate(startDate);
    const endFormatted = endDate ? formatGoogleDate(endDate) : nextDay(startDate);
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: title,
      dates: `${startFormatted}/${endFormatted}`,
      ...(location ? { location } : {}),
      ...(description ? { details: description } : {}),
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  function buildOutlookUrl(): string {
    const endStr = endDate ?? startDate;
    const params = new URLSearchParams({
      subject: title,
      startdt: startDate,
      enddt: endStr,
      ...(description ? { body: description } : {}),
      ...(location ? { location } : {}),
    });
    return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
  }

  function downloadICS() {
    const startFormatted = formatICSDate(startDate);
    const endFormatted = endDate ? formatICSDate(endDate) : nextDay(startDate);
    const descLine = description
      ? `DESCRIPTION:${description.replace(/\n/g, "\\n")}`
      : "";
    const locLine = location ? `LOCATION:${location}` : "";
    const urlLine = registrationUrl ? `URL:${registrationUrl}` : "";
    const icsLines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ForaHub//EN",
      "BEGIN:VEVENT",
      `SUMMARY:${title}`,
      `DTSTART;VALUE=DATE:${startFormatted}`,
      `DTEND;VALUE=DATE:${endFormatted}`,
      ...(locLine ? [locLine] : []),
      ...(descLine ? [descLine] : []),
      ...(urlLine ? [urlLine] : []),
      "END:VEVENT",
      "END:VCALENDAR",
    ];
    const blob = new Blob([icsLines.join("\r\n")], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, "_")}.ics`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  }

  function handleTrigger(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setOpen(prev => !prev);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={handleTrigger}
        aria-label="Add to calendar"
        className="p-1.5 rounded-md text-gray-400 hover:text-[#4ea8de] transition-colors"
      >
        <CalendarPlus size={16} />
      </button>

      {open && (
        <div className="absolute bottom-full right-0 mb-2 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px]">
          <a
            href={buildGoogleUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={() => setOpen(false)}
          >
            Google Calendar
          </a>
          <a
            href={buildOutlookUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={() => setOpen(false)}
          >
            Outlook
          </a>
          <button
            onClick={downloadICS}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Apple Calendar
          </button>
        </div>
      )}
    </div>
  );
}
