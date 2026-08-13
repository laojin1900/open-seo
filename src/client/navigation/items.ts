import {
  Bookmark,
  Bot,
  ClipboardCheck,
  Globe,
  LayoutDashboard,
  Link2,
  MessageSquare,
  Radar,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { linkOptions } from "@tanstack/react-router";
import { GoogleGlyphMuted } from "@/client/features/gsc/GoogleGlyph";

const projectNavItems = [
  {
    to: "/p/$projectId" as const,
    label: "nav.dashboard",
    icon: LayoutDashboard,
    // Without exact matching, the index path is a prefix of every project
    // route and the Dashboard item would render active everywhere.
    activeOptions: { exact: true, includeSearch: false },
  },
  {
    to: "/p/$projectId/keywords" as const,
    label: "nav.keywords",
    icon: Search,
  },
  {
    to: "/p/$projectId/saved" as const,
    label: "nav.saved",
    icon: Bookmark,
  },
  {
    to: "/p/$projectId/rank-tracking" as const,
    label: "nav.rankTracking",
    icon: TrendingUp,
  },
  {
    to: "/p/$projectId/search-performance" as const,
    label: "nav.gsc",
    icon: GoogleGlyphMuted,
  },
  // 老金定制：AI 可见度（GEO-ROADMAP.md P0）
  {
    to: "/p/$projectId/ai-visibility" as const,
    label: "nav.aiVisibility",
    icon: Radar,
  },
  {
    to: "/p/$projectId/domain" as const,
    label: "nav.domain",
    icon: Globe,
  },
  {
    to: "/p/$projectId/backlinks" as const,
    label: "nav.backlinks",
    icon: Link2,
  },
  {
    to: "/p/$projectId/audit" as const,
    label: "nav.audit",
    icon: ClipboardCheck,
  },
  {
    to: "/p/$projectId/brand-lookup" as const,
    label: "nav.brandLookup",
    icon: Sparkles,
  },
  {
    to: "/p/$projectId/prompt-explorer" as const,
    label: "nav.promptExplorer",
    icon: MessageSquare,
  },
] as const;

const aiNavItem = linkOptions({
  to: "/ai" as const,
  label: "nav.aiMcp",
  icon: Bot,
});

// Always-visible sidebar group (not project-scoped, unlike the groups below).
export const connectNavGroup = {
  label: "group.connect",
  items: [aiNavItem],
};

function getProjectNavItems(projectId: string) {
  return linkOptions(
    projectNavItems.map((item) => ({
      ...item,
      params: { projectId },
      search: {},
    })),
  );
}

// Grouped by scope: "My Site" is the project's own domain (tracked data),
// "Research" is point-at-anything lookup tools.
export function getProjectNavGroups(projectId: string) {
  const all = getProjectNavItems(projectId);
  const byPath = (path: (typeof projectNavItems)[number]["to"]) =>
    all.find((i) => i.to === path)!;

  return [
    {
      label: "group.overview",
      items: [byPath("/p/$projectId")],
    },
    {
      label: "group.research",
      items: [
        byPath("/p/$projectId/keywords"),
        byPath("/p/$projectId/domain"),
        byPath("/p/$projectId/backlinks"),
        byPath("/p/$projectId/brand-lookup"),
        byPath("/p/$projectId/prompt-explorer"),
      ],
    },
    {
      label: "group.mySite",
      items: [
        byPath("/p/$projectId/search-performance"),
        // 老金定制：AI Visibility（GEO-ROADMAP.md P0）
        byPath("/p/$projectId/ai-visibility"),
        byPath("/p/$projectId/rank-tracking"),
        byPath("/p/$projectId/saved"),
        byPath("/p/$projectId/audit"),
      ],
    },
  ];
}

export const dataforseoHelpLinkOptions = linkOptions({
  to: "/help/dataforseo-api-key",
});
