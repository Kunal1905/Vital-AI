"use client";

import Link from "next/link";

export default function CrisisButton() {
  return (
    <Link
      href="/crisis"
      className="w-full flex items-center justify-center gap-2 rounded-2xl border border-[#ff4f59] bg-gradient-to-r from-[#ff3c48] to-[#ff6b6b] p-5 text-white font-semibold shadow-lg hover:shadow-xl transition-shadow"
    >
      <span className="text-2xl">⚠️</span>
      <span className="text-lg">Crisis Help - Always Available</span>
    </Link>
  );
}
