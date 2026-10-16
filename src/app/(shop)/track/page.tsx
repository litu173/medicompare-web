import type { Metadata } from "next";
import { TrackForm } from "@/components/track-form";

export const metadata: Metadata = { title: "Track order" };

export default function TrackPage() {
  return (
    <div className="mx-auto max-w-sm space-y-4 pt-8">
      <div>
        <h1 className="text-2xl font-bold">Track your order</h1>
        <p className="mt-1 text-sm text-gray-700">Enter the order ID and the mobile number used at checkout.</p>
      </div>
      <TrackForm />
    </div>
  );
}
