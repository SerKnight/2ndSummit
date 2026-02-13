"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mountain,
  ArrowRight,
  CalendarDays,
  MapPin,
  Clock,
  Footprints,
  Palette,
  Users,
  CheckCircle2,
  Circle,
  Sparkles,
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

type ApprovedEvent = {
  _id: Id<"events">;
  title: string;
  description: string;
  pillar?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  locationName?: string;
  locationAddress?: string;
  price?: string;
  difficultyLevel?: string;
  tags: string[];
  sourceUrl?: string;
  marketName: string;
  categoryName: string;
};

function parseEventDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return null;
  return parsed;
}

const PILLAR_BADGE: Record<string, string> = {
  Move: "bg-emerald-100 text-emerald-700 border-emerald-300",
  Discover: "bg-amber-100 text-amber-700 border-amber-300",
  Connect: "bg-purple-100 text-purple-700 border-purple-300",
};

export default function HomePage() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Mountain className="h-8 w-8 text-amber-400 animate-pulse" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <MemberHome />;
  }

  return <LandingPage />;
}

/* ─── LANDING PAGE (unauthenticated) ─── */

function LandingPage() {
  const events = useQuery(api.events.listApproved, {});

  const upcomingEvents = useMemo(() => {
    if (!events) return [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return [...events]
      .filter((e) => {
        const d = parseEventDate(e.date);
        return d && d >= now;
      })
      .sort((a, b) => {
        const da = parseEventDate(a.date)!;
        const db = parseEventDate(b.date)!;
        return da.getTime() - db.getTime();
      })
      .slice(0, 6);
  }, [events]);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1a3a3a] via-[#2d4f50] to-[#1a3a3a]">
        <div className="absolute inset-0 opacity-[0.04]">
          <Mountain className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] text-white" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="max-w-2xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
              Your hub for{" "}
              <span className="text-amber-400">what&apos;s next...</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-gray-300 leading-relaxed max-w-xl">
              A community of highly curated experiences that promote physical
              activity, mental engagement, and social connection -- for people
              in their next chapter of life.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link href="/auth">
                <Button
                  size="lg"
                  className="bg-amber-500 text-gray-950 hover:bg-amber-400 font-semibold text-base px-8"
                >
                  Join 2nd Summit
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/calendar">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-gray-400 text-white hover:bg-white/10 hover:text-white text-base px-8"
                >
                  Explore Experiences
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
            Move. Discover. Connect.
          </h2>
          <p className="mt-4 text-center text-lg text-gray-500 max-w-2xl mx-auto">
            Three pillars designed to spark movement, conversation, and
            connection -- meeting you where you are.
          </p>

          <div className="mt-16 grid md:grid-cols-3 gap-8">
            <PillarCard
              icon={<Footprints className="h-8 w-8" />}
              title="Move"
              color="emerald"
              description="Physical activity, casual to adventurous. From morning walks and gentle yoga to hikes and cycling -- without pressure or performance expectations."
            />
            <PillarCard
              icon={<Palette className="h-8 w-8" />}
              title="Discover"
              color="amber"
              description="Mental engagement through culture, creativity, and hands-on exploration. Museum visits, cooking classes, live performances, and more."
            />
            <PillarCard
              icon={<Users className="h-8 w-8" />}
              title="Connect"
              color="purple"
              description="Shared interests creating space for real conversation and familiar faces. Naturally meet new people through simple, well-designed gatherings."
            />
          </div>
        </div>
      </section>

      {/* Featured Events */}
      {upcomingEvents.length > 0 && (
        <section className="py-20 bg-gray-50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                  Upcoming Experiences
                </h2>
                <p className="mt-2 text-gray-500">
                  Thoughtfully curated, just for you.
                </p>
              </div>
              <Link href="/calendar">
                <Button variant="outline" className="hidden sm:flex">
                  View all experiences
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingEvents.map((event) => (
                <EventCard key={event._id} event={event} />
              ))}
            </div>

            <div className="mt-8 text-center sm:hidden">
              <Link href="/calendar">
                <Button variant="outline">
                  View all experiences
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-[#1a3a3a] via-[#2d4f50] to-[#1a3a3a]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Ready for your next chapter?
          </h2>
          <p className="mt-4 text-lg text-gray-300">
            Join a community of people who believe staying active, curious, and
            connected matters most.
          </p>
          <div className="mt-8">
            <Link href="/auth">
              <Button
                size="lg"
                className="bg-amber-500 text-gray-950 hover:bg-amber-400 font-semibold text-base px-8"
              >
                Join 2nd Summit
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-400">
            Free to join. Just occasional updates, no spam.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Mountain className="h-5 w-5 text-amber-400" />
              <span className="text-sm font-semibold text-white">
                <span className="text-amber-400">2nd</span>Summit
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Move &middot; Discover &middot; Connect &middot; Denver, CO
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PillarCard({
  icon,
  title,
  color,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  color: "emerald" | "amber" | "purple";
  description: string;
}) {
  const colorMap = {
    emerald: {
      bg: "bg-emerald-50",
      icon: "text-emerald-600",
      border: "border-emerald-100",
    },
    amber: {
      bg: "bg-amber-50",
      icon: "text-amber-600",
      border: "border-amber-100",
    },
    purple: {
      bg: "bg-purple-50",
      icon: "text-purple-600",
      border: "border-purple-100",
    },
  };
  const c = colorMap[color];

  return (
    <div
      className={`rounded-2xl border ${c.border} ${c.bg} p-8 transition-shadow hover:shadow-md`}
    >
      <div className={c.icon}>{icon}</div>
      <h3 className="mt-4 text-xl font-bold text-gray-900">{title}</h3>
      <p className="mt-3 text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}

function EventCard({ event }: { event: ApprovedEvent }) {
  const d = parseEventDate(event.date);
  const badgeClass = PILLAR_BADGE[event.pillar ?? ""] ?? "bg-gray-100 text-gray-700";

  return (
    <Link href="/calendar" className="group">
      <div className="rounded-xl border bg-white p-5 shadow-sm transition-all group-hover:shadow-md group-hover:-translate-y-0.5">
        <div className="flex items-center justify-between mb-3">
          {event.pillar && (
            <Badge className={badgeClass}>
              {event.pillar}
            </Badge>
          )}
          {d && (
            <span className="text-sm text-gray-500">
              {d.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
        </div>
        <h3 className="font-semibold text-gray-900 line-clamp-2">
          {event.title}
        </h3>
        <p className="mt-2 text-sm text-gray-500 line-clamp-2">
          {event.description}
        </p>
        <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
          {event.locationName && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {event.locationName}
            </span>
          )}
          {event.startTime && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {event.startTime}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ─── MEMBER HOME (authenticated) ─── */

function MemberHome() {
  const user = useQuery(api.users.viewer);
  const events = useQuery(api.events.listApproved, {});

  const upcomingEvents = useMemo(() => {
    if (!events) return [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return [...events]
      .filter((e) => {
        const d = parseEventDate(e.date);
        return d && d >= now;
      })
      .sort((a, b) => {
        const da = parseEventDate(a.date)!;
        const db = parseEventDate(b.date)!;
        return da.getTime() - db.getTime();
      })
      .slice(0, 6);
  }, [events]);

  const firstName = user?.name?.split(" ")[0];

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
          </h1>
          <p className="mt-1 text-gray-500">
            Here&apos;s what&apos;s happening in your community.
          </p>
        </div>

        {/* Onboarding Card */}
        <div className="mb-8 rounded-2xl border bg-gradient-to-r from-[#2d4f50] to-[#3a6565] p-6 sm:p-8 text-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-amber-400" />
                <h2 className="text-lg font-bold">Get Started with 2nd Summit</h2>
              </div>
              <p className="text-gray-300 text-sm max-w-lg">
                Complete your profile so we can match you with experiences
                you&apos;ll love. This helps us personalize your
                recommendations.
              </p>
            </div>
            <span className="hidden sm:block text-sm text-amber-400 font-medium">
              0 / 4 complete
            </span>
          </div>

          <div className="mt-6 grid sm:grid-cols-2 gap-3">
            <OnboardingStep
              step={1}
              title="Tell us your interests"
              description="Which pillars spark your curiosity?"
              completed={false}
            />
            <OnboardingStep
              step={2}
              title="Choose your market"
              description="Where should we find experiences for you?"
              completed={false}
            />
            <OnboardingStep
              step={3}
              title="Set notification preferences"
              description="How often should we keep you in the loop?"
              completed={false}
            />
            <OnboardingStep
              step={4}
              title="Browse your first experiences"
              description="Explore what's coming up near you"
              completed={false}
            />
          </div>
        </div>

        {/* Explore by Pillar */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Explore by Pillar
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <Link href="/calendar">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-5 transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
                <Footprints className="h-6 w-6 text-emerald-600 mb-3" />
                <h3 className="font-bold text-gray-900">Move</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Physical activity, casual to adventurous
                </p>
              </div>
            </Link>
            <Link href="/calendar">
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-5 transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
                <Palette className="h-6 w-6 text-amber-600 mb-3" />
                <h3 className="font-bold text-gray-900">Discover</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Culture, creativity & exploration
                </p>
              </div>
            </Link>
            <Link href="/calendar">
              <div className="rounded-xl border border-purple-100 bg-purple-50 p-5 transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
                <Users className="h-6 w-6 text-purple-600 mb-3" />
                <h3 className="font-bold text-gray-900">Connect</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Shared interests & real conversation
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* Upcoming Events */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Coming Up</h2>
            <Link href="/calendar">
              <Button variant="outline" size="sm">
                View Full Calendar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {!events ? (
            <div className="text-center py-12 text-gray-500">
              Loading experiences...
            </div>
          ) : upcomingEvents.length === 0 ? (
            <div className="text-center py-12">
              <CalendarDays className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-800 text-lg">Nothing on the horizon just yet</p>
              <p className="text-gray-500 text-sm mt-1">
                Check back soon -- new experiences are always in the works
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingEvents.map((event) => (
                <EventCard key={event._id} event={event} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OnboardingStep({
  step,
  title,
  description,
  completed,
}: {
  step: number;
  title: string;
  description: string;
  completed: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-white/10 p-3">
      {completed ? (
        <CheckCircle2 className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
      ) : (
        <Circle className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
      )}
      <div>
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
    </div>
  );
}
