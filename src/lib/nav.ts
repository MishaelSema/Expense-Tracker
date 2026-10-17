import {
  HomeIcon,
  ListIcon,
  ChartIcon,
  TargetIcon,
  HeartIcon,
  HandshakeIcon,
  NoteIcon,
  UserIcon,
  SparkleIcon,
} from "@/components/ui/icons";

export const APP_NAME = "Ledger";

/** Primary destinations for the mobile tab bar and desktop top nav. */
export const primaryNav = [
  { href: "/dashboard", label: "Overview", icon: HomeIcon },
  { href: "/transactions", label: "Activity", icon: ListIcon },
  { href: "/budgets", label: "Budgets", icon: TargetIcon },
  { href: "/wishlist", label: "Wishlist", icon: HeartIcon },
];

/** Destinations reached through the "More" sheet on mobile / menu on desktop. */
export const secondaryNav = [
  { href: "/reports", label: "Insights", icon: ChartIcon },
  { href: "/goals", label: "Goals", icon: SparkleIcon },
  { href: "/debts", label: "Debts", icon: HandshakeIcon },
  { href: "/notes", label: "Notes and tasks", icon: NoteIcon },
];

export const accountNav = [
  { href: "/profile", label: "Profile", icon: UserIcon },
];
