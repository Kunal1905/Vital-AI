"use client";

import { SignedIn, UserButton } from "@clerk/nextjs";
import Link from "next/link";

function cardBase(extra = "") {
  return `rounded-2xl border border-[#233f75] bg-[#0f1d3a] ${extra}`;
}

const crisisResources = [
  {
    country: "United States",
    helplines: [
      { name: "988 Suicide & Crisis Lifeline", number: "988", url: "https://988lifeline.org" },
      { name: "Crisis Text Line", text: "HOME to 741741", url: "https://www.crisistextline.org" }
    ]
  },
  {
    country: "United Kingdom",
    helplines: [
      { name: "Samaritans", number: "116 123", url: "https://www.samaritans.org" },
      { name: "Mind", number: "0300 123 3393", url: "https://www.mind.org.uk" }
    ]
  },
  {
    country: "India",
    helplines: [
      { name: "Vandrevala Foundation", number: "1860 266 2345", url: "https://www.vandrevalafoundation.com" },
      { name: "AASRA", number: "98204 66726", url: "https://www.aasra.info" }
    ]
  },
  {
    country: "Australia",
    helplines: [
      { name: "Lifeline", number: "13 11 14", url: "https://www.lifeline.org.au" },
      { name: "Beyond Blue", number: "1300 224 636", url: "https://www.beyondblue.org.au" }
    ]
  },
  {
    country: "Canada",
    helplines: [
      { name: "988 Suicide Crisis Helpline", number: "988", url: "https://988.ca" },
      { name: "Crisis Services Canada", number: "1-833-456-4566", url: "https://www.crisisservicescanada.ca" }
    ]
  },
  {
    country: "Germany",
    helplines: [
      { name: "TelefonSeelsorge", number: "0800 111 0 111", url: "https://www.telefonseelsorge.de" }
    ]
  },
  {
    country: "France",
    helplines: [
      { name: "15 (Emergency)", number: "15", url: "https://www.service-public.fr" },
      { name: "3114 (Suicide Prevention)", number: "3114", url: "https://www.3114.fr" }
    ]
  }
];

export default function CrisisPage() {
  return (
    <div className="min-h-screen bg-[#020b22] text-[#d6e3ff]">
      <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-10 sm:px-6">
        <section className="space-y-5">
          <header className="flex items-center gap-3">
            <Link href="/home" className="text-2xl text-[#8ba1cb]">←</Link>
            <h2 className="text-5xl font-semibold text-[#f2f6ff]">Crisis Resources</h2>
          </header>

          <div className={cardBase("p-5 border-[#ff4f59]")}>
            <h3 className="text-2xl font-semibold text-[#ff4f59]">If you're in immediate danger</h3>
            <p className="mt-2 text-sm text-[#ffc3cf]">Call your local emergency services (e.g., 911 in the US, 999 in the UK, 112 in Europe)</p>
          </div>

          <div className="space-y-4">
            {crisisResources.map((country) => (
              <div key={country.country} className={cardBase("p-5")}>
                <h3 className="text-2xl font-semibold text-[#edf3ff]">{country.country}</h3>
                <div className="mt-3 space-y-3">
                  {country.helplines.map((helpline, index) => (
                    <a
                      key={index}
                      href={helpline.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-xl border border-[#2a4379] bg-[#1a2950] p-4 hover:border-[#22b7ff] transition-colors"
                    >
                      <p className="text-lg font-semibold text-[#d6e3ff]">{helpline.name}</p>
                      {helpline.number && (
                        <a
                          href={`tel:${helpline.number.replace(/\s/g, "")}`}
                          className="inline-block mt-1 text-[#22b7ff] hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {helpline.number}
                        </a>
                      )}
                      {helpline.text && (
                        <p className="mt-1 text-sm text-[#8aa3d8]">{helpline.text}</p>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <BottomNav active="crisis" />
    </div>
  );
}

function BottomNav({ active }: { active: "home" | "log" | "timeline" | "profile" | "crisis" }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 border-t border-[#1f3364] bg-[#0b1732]/95 backdrop-blur">
      <div className="mx-auto grid h-[5.5rem] w-full max-w-3xl grid-cols-5 pb-safe">
        <NavButton label="Home" icon="⌂" href="/home" active={active === "home"} />
        <NavButton label="Log" icon="⊕" href="/log" active={active === "log"} />
        <NavButton label="Timeline" icon="◷" href="/timeline" active={active === "timeline"} />
        <NavButton label="Profile" icon="◌" href="/profile" active={active === "profile"} />
        <UserAvatarNavItem />
      </div>
    </nav>
  );
}

function UserAvatarNavItem() {
  return (
    <div className="flex flex-col items-center justify-center gap-1">
      <SignedIn>
        <UserButton appearance={{ elements: { avatarBox: "h-7 w-7 border border-[#2f5ea8]" } }} />
      </SignedIn>
      <span className="text-xs text-[#90a7d8]">Account</span>
    </div>
  );
}

function NavButton({
  label,
  icon,
  href,
  active,
}: {
  label: string;
  icon: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link href={href} className="flex flex-col items-center justify-center gap-0.5 px-1">
      <span className={`text-lg sm:text-xl ${active ? "text-[#1bb5ff]" : "text-[#90a7d8]"}`}>{icon}</span>
      <span className={`text-[10px] sm:text-xs ${active ? "text-[#1bb5ff]" : "text-[#90a7d8]"} text-center leading-tight`}>{label}</span>
    </Link>
  );
}
