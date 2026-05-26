import { UserCircle2 } from "lucide-react";

const MESSAGES = [
  "Someone in Nairobi just saved World Health Summit 2027",
  "A researcher in Dhaka set an alert for SDG 3 events",
  "32 people saved WHA 79th Session this week",
  "Someone in Cairo just discovered 8 events in the EMRO region",
  "A professional in Lagos bookmarked COP31",
  "Someone in Manila found 12 Asia Pacific health events",
  "47 people are following Gates Foundation events",
  "A programme officer in Addis Ababa saved 3 events today",
  "Someone in Geneva just set a deadline reminder for UNGA",
  "28 professionals saved African Health Summit this week",
  "A student in Islamabad discovered a funded opportunity",
  "Someone in Brasilia found 6 Latin America SDG events",
  "A policy analyst in Kampala set 4 event alerts today",
  "Someone in Bangkok just saved ASEAN Health Meeting 2027",
  "34 people viewed World Health Summit in the last hour",
  "A researcher in Lagos set an alert for African Union events",
  "Someone in Kathmandu found 5 South Asia health conferences",
  "A public health student in Accra saved 3 global health events",
  "Someone in Jakarta discovered 9 Southeast Asia SDG events",
  "A health economist in Nairobi is tracking 7 upcoming convenings",
];

export default function LiveActivityTicker() {
  const items = [...MESSAGES, ...MESSAGES];

  return (
    <div
      className="w-full overflow-hidden py-3 px-4 flex items-center gap-0"
      style={{ backgroundColor: "#0f2a4a" }}
    >
      {/* LIVE badge */}
      <div className="flex items-center shrink-0 mr-4">
        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        <span className="text-xs font-bold text-white ml-2">LIVE</span>
      </div>

      {/* Scrolling track — duplicated for seamless loop */}
      <div className="overflow-hidden flex-1 min-w-0">
        <div className="ticker-track flex items-center gap-6 whitespace-nowrap">
          {items.map((msg, i) => (
            <span key={i} className="text-sm text-white/80 inline-flex items-center gap-1.5 shrink-0">
              <UserCircle2 className="w-3.5 h-3.5 text-blue-300 shrink-0" />
              <span>{msg}</span>
              <span aria-hidden="true" className="text-white/30 ml-4">•</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
