import {
  ArrowLeftRight,
  BookOpen,
  Brain,
  Building2,
  Calculator,
  Circle,
  ClipboardList,
  Eye,
  Flag,
  GraduationCap,
  Headphones,
  Landmark,
  Languages,
  Lightbulb,
  ListOrdered,
  PenLine,
  Sigma,
  SpellCheck2,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * Icon registry for data-driven icons (categories, subtests, package
 * thumbnails). Kept as an explicit map so only the icons actually used end up
 * in the client bundle.
 */
export const ICONS: Record<string, LucideIcon> = {
  ArrowLeftRight,
  BookOpen,
  Brain,
  Building2,
  Calculator,
  ClipboardList,
  Eye,
  Flag,
  GraduationCap,
  Headphones,
  Landmark,
  Languages,
  Lightbulb,
  ListOrdered,
  PenLine,
  Sigma,
  SpellCheck2,
  UserRound,
  Users,
};

export function DynamicIcon({ name, className }: { name?: string; className?: string }) {
  const Icon = (name && ICONS[name]) || Circle;
  return <Icon className={className} />;
}

export default DynamicIcon;
