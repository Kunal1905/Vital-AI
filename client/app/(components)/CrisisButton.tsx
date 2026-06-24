"use client";

import Link from "next/link";

export default function CrisisButton() {
  return (
    <Link
      href="/crisis"
      className="fixed right-4 top-4 z-50 flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ff3c48] to-[#ff6b6b] px-5 py-3 text-white font-semibold shadow-lg hover:shadow-xl transition-shadow"
    >
      <span className="text-xl">⚠️</span>
      <span>Crisis Help</span>
    </Link>
  );
}
