import { Metadata } from "next";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "ForaHub Terms of Service",
};

export default function TermsPage() {
  const sections = [
    {
      title: "1. Acceptance of Terms",
      content: "By accessing or using ForaHub (\"Service\"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service. These terms apply to all users, including visitors, registered users, and organizations that submit events.",
    },
    {
      title: "2. Use of the Service",
      content: "ForaHub is a platform for discovering, tracking, and sharing global development events. You may use the Service for lawful purposes only. You agree not to scrape, reproduce, or redistribute our event database without prior written consent. You are responsible for maintaining the confidentiality of your account credentials.",
    },
    {
      title: "3. User Accounts",
      content: "To access certain features, you must create an account. You are responsible for all activity under your account. You must provide accurate, current, and complete information. We reserve the right to suspend or terminate accounts that violate these terms.",
    },
    {
      title: "4. Event Submissions",
      content: "Organizations may submit events for listing on ForaHub. By submitting, you represent that you have the authority to list the event and that all information is accurate. ForaHub reserves the right to accept, reject, or remove any event listing. Submitted events are subject to review before publication.",
    },
    {
      title: "5. Intellectual Property",
      content: "The ForaHub platform, including its design, software, and original content, is owned by ForaHub and protected by intellectual property laws. Event data sourced from public websites remains the property of the respective organizations. User-generated content (reviews, submissions) grants ForaHub a non-exclusive license to display and distribute such content.",
    },
    {
      title: "6. Privacy",
      content: "Your use of ForaHub is also governed by our Privacy Policy, which is incorporated into these Terms by reference. We handle your personal data in accordance with our Privacy Policy and applicable data protection laws.",
    },
    {
      title: "7. Disclaimers",
      content: "ForaHub provides event information on an \"as is\" basis. We do not guarantee the accuracy, completeness, or timeliness of event listings. Event details, dates, and availability are subject to change by the organizing institutions. ForaHub is not responsible for any errors in third-party event information.",
    },
    {
      title: "8. Limitation of Liability",
      content: "To the maximum extent permitted by law, ForaHub and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service. Our total liability for any claim shall not exceed the amount you paid for the Service in the twelve months prior to the claim.",
    },
    {
      title: "9. Governing Law",
      content: "These Terms shall be governed by and construed in accordance with applicable international commercial law, without regard to conflict of law provisions. Any disputes shall be resolved through binding arbitration.",
    },
    {
      title: "10. Changes to Terms",
      content: "We may modify these Terms at any time. We will notify registered users of material changes by email. Continued use of the Service after changes constitutes acceptance of the new Terms.",
    },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="bg-[#0f2a4a] px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-extrabold text-white">Terms of Service</h1>
          <p className="text-blue-200 text-sm mt-2">Last updated: January 2026</p>
        </div>
      </div>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {sections.map(({ title, content }) => (
          <section key={title}>
            <h2 className="text-lg font-bold text-[#0f2a4a] dark:text-white mb-2">{title}</h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm">{content}</p>
          </section>
        ))}
        <p className="text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-[#334155] pt-6">
          Questions? Contact us at{" "}
          <a href="mailto:mo@forahub.org" className="text-[#4ea8de] hover:underline">mo@forahub.org</a>
        </p>
      </main>
    </div>
  );
}
