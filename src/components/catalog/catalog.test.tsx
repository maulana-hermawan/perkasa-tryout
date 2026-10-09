// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({ id: "pkg-skd-a" }),
  useSearchParams: () => new URLSearchParams(),
  notFound: vi.fn(),
}));

import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import { RichContent } from "@/components/common/rich-content";
import { CatalogGrid } from "./catalog-grid";
import { createSeedDatabase } from "@/lib/seed";
import type { Locale } from "@/types";

function Providers({ children, locale = "id" }: { children: React.ReactNode; locale?: Locale }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <I18nProvider initialLocale={locale}>
        <TooltipProvider>{children}</TooltipProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}

const db = createSeedDatabase();

beforeEach(() => {
  // jsdom reports a UTC timezone / en-US navigator, so pin the stored choice.
  window.localStorage.setItem("tryoutku.locale", "id");
  document.documentElement.lang = "id";
});

afterEach(cleanup);

describe("CatalogGrid", () => {
  it("renders every published package with its pricing badge", () => {
    const published = db.packages.filter((pkg) => pkg.status === "published");
    render(
      <Providers>
        <CatalogGrid
          packages={published}
          categories={db.categories}
          accessMap={{
            "pkg-toefl-mini": { state: "open", canStart: true, discussionUnlocked: true },
            "pkg-kepribadian": { state: "open", canStart: true, discussionUnlocked: true },
            "pkg-skd-a": { state: "freemium-locked", canStart: true, discussionUnlocked: false },
            "pkg-kecermatan": { state: "pending", canStart: true, discussionUnlocked: false },
            "pkg-umum-1": { state: "locked", canStart: false, discussionUnlocked: false },
          }}
        />
      </Providers>,
    );

    // Titles
    expect(screen.getByText(/Tryout SKD CPNS 2025 – Paket A/)).toBeTruthy();
    expect(screen.getByText(/TOEFL ITP Mini Test/)).toBeTruthy();
    expect(screen.getByText(/Tes Kecermatan Lengkap/)).toBeTruthy();

    // Pricing model badges (short labels)
    expect(screen.getAllByText("Gratis").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Freemium").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Berbayar").length).toBeGreaterThan(0);

    // Freemium packages are playable → the CTA says "Mulai"
    expect(screen.getAllByText("Mulai").length).toBeGreaterThan(0);
    // Locked paid package → "Beli"
    expect(screen.getAllByText("Beli").length).toBeGreaterThan(0);
    // Pending payment notice
    expect(screen.getByText("Menunggu verifikasi")).toBeTruthy();
  });

  it("formats prices with Intl (id-ID)", () => {
    render(
      <Providers>
        <CatalogGrid
          packages={[db.packages[0]]}
          categories={db.categories}
          accessMap={{ "pkg-skd-a": { state: "locked", canStart: false, discussionUnlocked: false } }}
        />
      </Providers>,
    );
    expect(screen.getByText(/Rp\s?39\.000/)).toBeTruthy();
  });

  it("switches language to English", () => {
    window.localStorage.setItem("tryoutku.locale", "en");
    render(
      <Providers locale="en">
        <CatalogGrid
          packages={[db.packages[0]]}
          categories={db.categories}
          accessMap={{ "pkg-skd-a": { state: "locked", canStart: false, discussionUnlocked: false } }}
        />
      </Providers>,
    );
    expect(screen.getByText(/CPNS SKD Tryout 2025/)).toBeTruthy();
  });
});

describe("RichContent", () => {
  it("renders sanitized HTML and upgrades math nodes to KaTeX", () => {
    const { container } = render(
      <Providers>
        <RichContent
          content={{
            id: '<p>Nilai dari <span data-math="inline">x^{2}+1</span> adalah positif.</p><script>alert(1)</script>',
          }}
        />
      </Providers>,
    );

    // Math node rendered by KaTeX
    expect(container.querySelector(".katex")?.textContent).toContain("x");
    // Script tags are stripped by the sanitizer (only the harmless text remains)
    const content = container.querySelector(".rich-content") as HTMLElement;
    expect(content.querySelector("script")).toBeNull();
    expect(content.innerHTML).not.toContain("<script");
  });

  it("keeps allow-listed markup only", () => {
    const { container } = render(
      <Providers>
        <RichContent
          content={{
            id: '<p><strong>Tebal</strong> dan <em>miring</em></p><iframe src="https://evil.test"></iframe><a href="javascript:alert(1)">link</a>',
          }}
        />
      </Providers>,
    );
    const content = container.querySelector(".rich-content") as HTMLElement;
    expect(content.querySelector("strong")?.textContent).toBe("Tebal");
    expect(content.querySelector("em")?.textContent).toBe("miring");
    expect(content.querySelector("iframe")).toBeNull();
    // javascript: URLs are dropped, the link itself is kept
    expect(content.querySelector("a")).not.toBeNull();
    expect(content.querySelector("a")?.getAttribute("href")).toBeNull();
    expect(content.innerHTML).not.toContain("javascript:");
  });
});
