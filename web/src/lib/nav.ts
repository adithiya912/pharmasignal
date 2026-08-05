import {
  LayoutDashboard,
  FilePlus2,
  FlaskConical,
  FileClock,
  MessageCircle,
  Bell,
  User,
  Settings,
  ClipboardList,
  Activity,
  Network,
  Search,
  BarChart3,
  Users,
  FileText,
  Cpu,
  Waypoints,
  ScrollText,
} from "lucide-react";
import type { NavItem } from "@/components/shell/app-shell";

export const patientNav: NavItem[] = [
  { label: "Dashboard", href: "/patient", icon: LayoutDashboard },
  { label: "Report Side Effect", href: "/patient/report/new", icon: FilePlus2 },
  { label: "Drug Interaction Checker", href: "/patient/interactions", icon: FlaskConical },
  { label: "My Reports", href: "/patient/reports", icon: FileClock },
  { label: "AI Health Assistant", href: "/patient/assistant", icon: MessageCircle },
  { label: "Notifications", href: "/patient/notifications", icon: Bell },
  { label: "Profile", href: "/patient/profile", icon: User },
  { label: "Settings", href: "/patient/settings", icon: Settings },
];

export const doctorNav: NavItem[] = [
  { label: "Dashboard", href: "/doctor", icon: LayoutDashboard },
  { label: "Patient Reports", href: "/doctor/reports", icon: ClipboardList },
  { label: "Emerging Safety Signals", href: "/doctor/signals", icon: Activity },
  { label: "Drug Interaction Network", href: "/doctor/network", icon: Network },
  { label: "Evidence Explorer", href: "/doctor/evidence", icon: Search },
  { label: "Analytics", href: "/doctor/analytics", icon: BarChart3 },
  { label: "Notifications", href: "/doctor/notifications", icon: Bell },
  { label: "Settings", href: "/doctor/settings", icon: Settings },
];

export const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Drug Safety Reports", href: "/admin/reports", icon: FileText },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { label: "AI Model Monitoring", href: "/admin/model", icon: Cpu },
  { label: "Knowledge Graph", href: "/admin/graph", icon: Waypoints },
  { label: "System Logs", href: "/admin/logs", icon: ScrollText },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

/**
 * Keyed lookup, not a prop passed down from a server layout — nav items
 * hold Lucide icon component references, which aren't plain serializable
 * data across the server/client boundary (React Server Components reject
 * passing component references as a plain prop). AppShell (a client
 * component) imports this map directly instead.
 */
export const navByRole = {
  patient: patientNav,
  doctor: doctorNav,
  admin: adminNav,
} as const;
