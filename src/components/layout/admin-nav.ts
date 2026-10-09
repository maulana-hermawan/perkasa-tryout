"use client";

import {
  BookOpenCheck,
  Boxes,
  Building2,
  ClipboardList,
  CreditCard,
  Gauge,
  Layers,
  ListChecks,
  Radio,
  Settings,
  TicketPercent,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface AdminNavItem {
  /** URL segment under /admin */
  section?: string;
  href: string;
  labelKey: string;
  icon: LucideIcon;
  /** Implemented sections render their own page. */
  ready?: boolean;
}

export interface AdminNavGroup {
  titleKey: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    titleKey: "admin.sectionTitle",
    items: [
      { href: "/admin", labelKey: "nav.dashboard", icon: Gauge, ready: true },
      { section: "paket", href: "/admin/paket", labelKey: "nav.packages", icon: Boxes },
      { section: "bank-soal", href: "/admin/bank-soal", labelKey: "nav.questionBank", icon: BookOpenCheck },
      { section: "sesi", href: "/admin/sesi", labelKey: "nav.sessions", icon: Radio },
      { section: "pembayaran", href: "/admin/pembayaran", labelKey: "nav.payments", icon: CreditCard },
      { section: "pengguna", href: "/admin/pengguna", labelKey: "nav.users", icon: Users },
    ],
  },
  {
    titleKey: "admin.configurationTitle",
    items: [
      { section: "tipe-tes", href: "/admin/tipe-tes", labelKey: "nav.testTypes", icon: Layers },
      { section: "subtes", href: "/admin/subtes", labelKey: "nav.subtests", icon: ListChecks },
      { section: "kategori", href: "/admin/kategori", labelKey: "nav.categories", icon: Building2 },
      { section: "voucher", href: "/admin/voucher", labelKey: "nav.vouchers", icon: TicketPercent },
      { section: "pengaturan", href: "/admin/pengaturan", labelKey: "nav.settings", icon: Settings },
    ],
  },
  {
    titleKey: "admin.dataTitle",
    items: [
      { section: "penilaian", href: "/admin/penilaian", labelKey: "nav.essayGrading", icon: ClipboardList },
      { section: "log", href: "/admin/log", labelKey: "nav.activityLog", icon: ListChecks },
    ],
  },
];

export const ADMIN_BOTTOM_NAV: AdminNavItem[] = [
  { href: "/admin", labelKey: "nav.dashboard", icon: Gauge },
  { section: "bank-soal", href: "/admin/bank-soal", labelKey: "nav.questionBank", icon: BookOpenCheck },
  { section: "paket", href: "/admin/paket", labelKey: "nav.packages", icon: Boxes },
  { section: "sesi", href: "/admin/sesi", labelKey: "nav.sessions", icon: Radio },
  { section: "pembayaran", href: "/admin/pembayaran", labelKey: "nav.payments", icon: CreditCard },
];

export function findAdminSection(section: string) {
  return ADMIN_NAV.flatMap((group) => group.items).find((item) => item.section === section);
}
