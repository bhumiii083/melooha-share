import { MetricsBoard } from "@/components/metrics-board";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Metrics",
  description: "Share activation, coach acceptance, grounded readings, and time to the first word.",
};

export default function Page() {
  return <MetricsBoard />;
}
