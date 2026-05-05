import { Metadata } from "next";
import Navbar from "@/components/Navbar";
import AssistantClient from "./AssistantClient";

export const metadata: Metadata = { title: "AI Assistant" };

export default function AssistantPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <AssistantClient />
    </div>
  );
}
