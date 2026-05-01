"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Share2, X, Link2, MessageCircle, Users, Hash, Check } from "lucide-react";
import {
  WhatsappShareButton, WhatsappIcon,
  FacebookShareButton, FacebookIcon,
  XShareButton, XIcon,
  LinkedinShareButton, LinkedinIcon,
  TelegramShareButton, TelegramIcon,
  RedditShareButton, RedditIcon,
  EmailShareButton, EmailIcon,
} from "react-share";

interface ShareMenuProps {
  eventId: string;
  eventTitle: string;
  startDate?: string;
  location?: string | null;
}

function LabeledPlatform({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="hover:opacity-85 transition-opacity">{children}</div>
      <span className="text-xs text-gray-500 text-center leading-tight">{label}</span>
    </div>
  );
}

function CustomPlatform({
  label, bgColor, icon, href, onClick,
}: {
  label: string; bgColor: string; icon: React.ReactNode;
  href?: string; onClick?: () => void;
}) {
  const circle = (
    <div
      style={{ backgroundColor: bgColor, width: 40, height: 40 }}
      className="rounded-full flex items-center justify-center"
    >
      {icon}
    </div>
  );
  const cls = "flex flex-col items-center gap-1.5 hover:opacity-85 transition-opacity";
  const lbl = <span className="text-xs text-gray-500 text-center leading-tight">{label}</span>;

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {circle}{lbl}
      </a>
    );
  }
  return (
    <button onClick={onClick} className={cls}>
      {circle}{lbl}
    </button>
  );
}

export default function ShareMenu({ eventId, eventTitle, startDate, location }: ShareMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [slackCopied, setSlackCopied] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [shareUrl, setShareUrl] = useState(`/events/${eventId}`);

  useEffect(() => {
    setIsMounted(true);
    setShareUrl(`${window.location.origin}/events/${eventId}`);
  }, [eventId]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const datePart = startDate
    ? new Date(startDate).toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
      })
    : null;
  const shareText = [eventTitle, datePart, location].filter(Boolean).join(" · ");
  const emailBody = [
    "Check out this event on ForaHub:",
    "",
    eventTitle,
    ...(datePart ? [`Date: ${datePart}`] : []),
    ...(location ? [`Location: ${location}`] : []),
    "",
    shareUrl,
  ].join("\n");

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function copyForSlack() {
    await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
    setSlackCopied(true);
    setTimeout(() => setSlackCopied(false), 1500);
  }

  function handleTrigger(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  }

  function handleBackdrop(e: React.MouseEvent) {
    e.stopPropagation();
    setOpen(false);
  }

  function stopProp(e: React.MouseEvent) {
    e.stopPropagation();
  }

  const smsUrl = `sms:?body=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`;
  const teamsUrl = `https://teams.microsoft.com/l/chat/0/0?message=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`;

  return (
    <>
      <button
        onClick={handleTrigger}
        aria-label="Share event"
        className="p-1.5 rounded-md text-gray-400 hover:text-[#4ea8de] transition-colors"
      >
        <Share2 size={16} />
      </button>

      {open && isMounted && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          onClick={handleBackdrop}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            onClick={stopProp}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="pr-4">
                <h3 className="font-semibold text-[#0f2a4a]">Share this event</h3>
                <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{eventTitle}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 transition-colors shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Copy link bar */}
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-6">
              <Link2 size={13} className="text-gray-400 shrink-0" />
              <span className="text-xs text-gray-500 flex-1 truncate">{shareUrl}</span>
              <button
                onClick={copyLink}
                className={`text-xs font-semibold shrink-0 transition-colors ${
                  copied ? "text-green-600" : "text-[#4ea8de] hover:text-[#3a95cc]"
                }`}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            {/* Platform grid — 4 columns */}
            <div className="grid grid-cols-4 gap-x-3 gap-y-5">
              <LabeledPlatform label="WhatsApp">
                <WhatsappShareButton url={shareUrl} title={shareText} separator="\n">
                  <WhatsappIcon size={40} round />
                </WhatsappShareButton>
              </LabeledPlatform>

              <LabeledPlatform label="Facebook">
                <FacebookShareButton url={shareUrl}>
                  <FacebookIcon size={40} round />
                </FacebookShareButton>
              </LabeledPlatform>

              <LabeledPlatform label="Twitter / X">
                <XShareButton url={shareUrl} title={shareText}>
                  <XIcon size={40} round />
                </XShareButton>
              </LabeledPlatform>

              <LabeledPlatform label="LinkedIn">
                <LinkedinShareButton url={shareUrl} title={eventTitle}>
                  <LinkedinIcon size={40} round />
                </LinkedinShareButton>
              </LabeledPlatform>

              <LabeledPlatform label="Telegram">
                <TelegramShareButton url={shareUrl} title={shareText}>
                  <TelegramIcon size={40} round />
                </TelegramShareButton>
              </LabeledPlatform>

              <LabeledPlatform label="Reddit">
                <RedditShareButton url={shareUrl} title={eventTitle}>
                  <RedditIcon size={40} round />
                </RedditShareButton>
              </LabeledPlatform>

              <LabeledPlatform label="Email">
                <EmailShareButton url={shareUrl} subject={eventTitle} body={emailBody}>
                  <EmailIcon size={40} round />
                </EmailShareButton>
              </LabeledPlatform>

              <CustomPlatform
                label="Teams"
                bgColor="#6264A7"
                icon={<Users size={18} className="text-white" />}
                href={teamsUrl}
              />

              <CustomPlatform
                label={slackCopied ? "Copied!" : "Slack"}
                bgColor="#4A154B"
                icon={<Hash size={18} className="text-white" />}
                onClick={copyForSlack}
              />

              <CustomPlatform
                label="SMS"
                bgColor="#22C55E"
                icon={<MessageCircle size={18} className="text-white" />}
                href={smsUrl}
              />

              <CustomPlatform
                label={copied ? "Copied!" : "Copy Link"}
                bgColor={copied ? "#16A34A" : "#6B7280"}
                icon={copied
                  ? <Check size={18} className="text-white" />
                  : <Link2 size={18} className="text-white" />}
                onClick={copyLink}
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
