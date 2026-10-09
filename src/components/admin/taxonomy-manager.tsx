"use client";

import { useMemo, useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import { dataSource } from "@/lib/repositories";
import { useDatabase } from "@/lib/store/db";
import type { Category, I18nText, Subtest, TestType } from "@/types";
import { AdminEmpty, AdminPageHeader, AdminRow, AdminToolbar } from "@/components/admin/admin-page";
import { DynamicIcon } from "@/components/common/dynamic-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/exam/native-select";

export type TaxonomyKind = "testType" | "subtest" | "category";
export type TaxonomyItem = TestType | Subtest | Category;

interface TaxonomyManagerProps {
  kind: TaxonomyKind;
  title: string;
  subtitle: string;
}

interface Draft {
  nameId: string;
  nameEn: string;
  descriptionId: string;
  descriptionEn: string;
  slug: string;
  icon: string;
  order: string;
  durationMinutes: string;
  questionCount: string;
  passingGrade: string;
  resultKind: "score" | "profile";
}

const slugOf = (item: TaxonomyItem) => (item as { slug?: string }).slug ?? "";
const iconOf = (item: TaxonomyItem) => (item as { icon?: string }).icon ?? "";
const descriptionOf = (item: TaxonomyItem) => (item as { description?: I18nText }).description;

function draftOf(item: TaxonomyItem, kind: TaxonomyKind, tx: (value?: I18nText) => string): Draft {
  const description = descriptionOf(item);
  return {
    nameId: tx(item.name),
    nameEn: item.name.en ?? "",
    descriptionId: tx(description ?? { id: "", en: "" }),
    descriptionEn: description?.en ?? "",
    slug: slugOf(item),
    icon: iconOf(item),
    order: String(item.order),
    durationMinutes:
      kind === "subtest" ? String((item as Subtest).durationMinutes ?? "") : String((item as TestType).defaultDurationMinutes),
    questionCount: kind === "subtest" ? String((item as Subtest).questionCount) : "",
    passingGrade: kind === "subtest" ? String((item as Subtest).passingGrade ?? "") : "",
    resultKind: (kind === "subtest" ? (item as Subtest).resultKind : (item as TestType).resultKind) ?? "score",
  };
}

/**
 * Shared list + edit screen for the three taxonomy tables (test types, subtests
 * and categories). They all share `name`, `description`, `order` and differ
 * only in a handful of fields, which keeps one screen instead of three.
 */
export function TaxonomyManager({ kind, title, subtitle }: TaxonomyManagerProps) {
  const { t, tx } = useI18n();
  const db = useDatabase();

  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pending, setPending] = useState(false);

  const items = useMemo<TaxonomyItem[]>(() => {
    const list: TaxonomyItem[] =
      kind === "testType" ? db.testTypes : kind === "subtest" ? db.subtests : db.categories;
    const query = search.trim().toLowerCase();
    const filtered = query
      ? list.filter((item) => `${tx(item.name)} ${"slug" in item ? item.slug : ""}`.toLowerCase().includes(query))
      : [...list];
    return filtered.sort((a, b) => {
      if (kind === "subtest") {
        const aType = db.testTypes.find((type) => type.id === (a as Subtest).testTypeId)?.order ?? 0;
        const bType = db.testTypes.find((type) => type.id === (b as Subtest).testTypeId)?.order ?? 0;
        if (aType !== bType) return aType - bType;
      }
      return a.order - b.order;
    });
  }, [kind, db.testTypes, db.subtests, db.categories, search, tx]);

  function openEdit(item: TaxonomyItem) {
    setEditingId(item.id);
    setDraft(draftOf(item, kind, tx));
  }

  async function handleSave() {
    if (!editingId || !draft) return;
    setPending(true);
    try {
      const patch: Record<string, unknown> = {
        name: { id: draft.nameId.trim(), en: draft.nameEn.trim() || draft.nameId.trim() },
        description: {
          id: draft.descriptionId.trim(),
          en: draft.descriptionEn.trim() || draft.descriptionId.trim(),
        },
        order: Number(draft.order) || 0,
      };

      if (kind === "category") {
        patch.slug = draft.slug.trim();
        patch.icon = draft.icon.trim() || "sparkles";
      }
      if (kind === "testType") {
        patch.slug = draft.slug.trim();
        patch.icon = draft.icon.trim() || "sparkles";
        patch.defaultDurationMinutes = Math.max(1, Number(draft.durationMinutes) || 1);
        patch.resultKind = draft.resultKind;
      }
      if (kind === "subtest") {
        patch.durationMinutes = draft.durationMinutes.trim() ? Math.max(1, Number(draft.durationMinutes)) : null;
        patch.questionCount = Math.max(1, Number(draft.questionCount) || 1);
        patch.passingGrade = draft.passingGrade.trim() ? Number(draft.passingGrade) : null;
      }

      if (kind === "testType") await dataSource.testTypes.update(editingId, patch);
      else if (kind === "subtest") await dataSource.subtests.update(editingId, patch);
      else await dataSource.categories.update(editingId, patch);

      toast.success(t("admin.taxonomy.saveToast"));
      setEditingId(null);
      setDraft(null);
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title={title} subtitle={subtitle} count={items.length} />

      <AdminToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t("admin.taxonomy.searchPlaceholder")}
      />

      {items.length === 0 ? (
        <AdminEmpty title={t("admin.taxonomy.empty")} />
      ) : (
        <ul className="space-y-2.5">
          {items.map((item) => (
            <AdminRow key={item.id}>
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <DynamicIcon name={iconOf(item)} className="size-5" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold">{tx(item.name)}</p>
                    <Badge variant="muted">#{item.order}</Badge>
                    {slugOf(item) && (
                      <span className="font-mono text-[0.6875rem] text-muted-foreground">{slugOf(item)}</span>
                    )}
                  </div>
                  {descriptionOf(item) && (
                    <p className="truncate text-xs text-muted-foreground">{tx(descriptionOf(item))}</p>
                  )}
                  <MetaRow item={item} kind={kind} />
                </div>

                <Button size="sm" variant="outline" onClick={() => openEdit(item)}>
                  <Pencil className="size-4" />
                  {t("admin.taxonomy.edit")}
                </Button>
              </div>
            </AdminRow>
          ))}
        </ul>
      )}

      <Dialog open={Boolean(editingId)} onOpenChange={(open) => (open ? null : setEditingId(null))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("admin.taxonomy.edit")}</DialogTitle>
            <DialogDescription>{subtitle}</DialogDescription>
          </DialogHeader>

          {draft && (
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="tax-name-id">{t("admin.taxonomy.nameId")}</Label>
                  <Input
                    id="tax-name-id"
                    value={draft.nameId}
                    onChange={(event) => setDraft({ ...draft, nameId: event.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tax-name-en">{t("admin.taxonomy.nameEn")}</Label>
                  <Input
                    id="tax-name-en"
                    value={draft.nameEn}
                    onChange={(event) => setDraft({ ...draft, nameEn: event.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="tax-desc-id">{t("admin.taxonomy.descriptionId")}</Label>
                  <Input
                    id="tax-desc-id"
                    value={draft.descriptionId}
                    onChange={(event) => setDraft({ ...draft, descriptionId: event.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tax-desc-en">{t("admin.taxonomy.descriptionEn")}</Label>
                  <Input
                    id="tax-desc-en"
                    value={draft.descriptionEn}
                    onChange={(event) => setDraft({ ...draft, descriptionEn: event.target.value })}
                  />
                </div>
              </div>

              {(kind === "testType" || kind === "category") && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="tax-slug">{t("admin.taxonomy.slug")}</Label>
                    <Input
                      id="tax-slug"
                      value={draft.slug}
                      onChange={(event) => setDraft({ ...draft, slug: event.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tax-icon">{t("admin.taxonomy.icon")}</Label>
                    <Input
                      id="tax-icon"
                      value={draft.icon}
                      onChange={(event) => setDraft({ ...draft, icon: event.target.value })}
                    />
                  </div>
                </div>
              )}

              <div
                className={
                  kind === "subtest" ? "grid gap-2 sm:grid-cols-3" : "grid gap-2 sm:grid-cols-2"
                }
              >
                <div className="space-y-1.5">
                  <Label htmlFor="tax-order">{t("admin.taxonomy.order")}</Label>
                  <Input
                    id="tax-order"
                    inputMode="numeric"
                    value={draft.order}
                    onChange={(event) => setDraft({ ...draft, order: event.target.value.replace(/[^0-9]/g, "") })}
                  />
                </div>

                {kind === "testType" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="tax-duration">{t("admin.taxonomy.durationMinutes")}</Label>
                    <Input
                      id="tax-duration"
                      inputMode="numeric"
                      value={draft.durationMinutes}
                      onChange={(event) =>
                        setDraft({ ...draft, durationMinutes: event.target.value.replace(/[^0-9]/g, "") })
                      }
                    />
                  </div>
                )}

                {kind === "subtest" && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="tax-sub-duration">{t("admin.taxonomy.durationMinutes")}</Label>
                      <Input
                        id="tax-sub-duration"
                        inputMode="numeric"
                        value={draft.durationMinutes}
                        onChange={(event) =>
                          setDraft({ ...draft, durationMinutes: event.target.value.replace(/[^0-9]/g, "") })
                        }
                        placeholder={t("admin.taxonomy.untimed")}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="tax-questions">{t("admin.taxonomy.questionCount")}</Label>
                      <Input
                        id="tax-questions"
                        inputMode="numeric"
                        value={draft.questionCount}
                        onChange={(event) =>
                          setDraft({ ...draft, questionCount: event.target.value.replace(/[^0-9]/g, "") })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="tax-passing">{t("admin.taxonomy.passingGrade")}</Label>
                      <Input
                        id="tax-passing"
                        inputMode="numeric"
                        value={draft.passingGrade}
                        onChange={(event) =>
                          setDraft({ ...draft, passingGrade: event.target.value.replace(/[^0-9]/g, "") })
                        }
                        placeholder="-"
                      />
                    </div>
                  </>
                )}

                {(kind === "testType" || kind === "subtest") && (
                  <div className="space-y-1.5">
                    <Label htmlFor="tax-result">{t("admin.taxonomy.resultKind")}</Label>
                    <NativeSelect
                      ariaLabel={t("admin.taxonomy.resultKind")}
                      className="h-11 w-full text-sm"
                      value={draft.resultKind}
                      onValueChange={(value) => setDraft({ ...draft, resultKind: value as Draft["resultKind"] })}
                      options={[
                        { value: "score", label: t("admin.taxonomy.score") },
                        { value: "profile", label: t("admin.taxonomy.profile") },
                      ]}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingId(null)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={pending || !draft?.nameId.trim()}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* --------------------------------- meta ---------------------------------- */

function MetaRow({ item, kind }: { item: TaxonomyItem; kind: TaxonomyKind }) {
  const { t, tx } = useI18n();
  const db = useDatabase();

  const parts: string[] = [];

  if (kind === "testType") {
    const testType = item as TestType;
    const packages = db.packages.filter((pkg) => pkg.testTypeId === testType.id).length;
    const subtests = db.subtests.filter((subtest) => subtest.testTypeId === testType.id).length;
    parts.push(`${t("admin.taxonomy.metaPackages")}: ${packages}`);
    parts.push(`${t("admin.taxonomy.metaSubtests")}: ${subtests}`);
    parts.push(`${t("admin.taxonomy.durationMinutes")}: ${testType.defaultDurationMinutes}`);
    parts.push(`${t("admin.taxonomy.resultKind")}: ${t(`admin.taxonomy.${testType.resultKind}`)}`);
  } else if (kind === "subtest") {
    const subtest = item as Subtest;
    const questions = db.questions.filter((question) => question.subtestId === subtest.id).length;
    parts.push(`${t("admin.taxonomy.metaTestType")}: ${tx(db.testTypes.find((type) => type.id === subtest.testTypeId)?.name)}`);
    parts.push(`${t("admin.taxonomy.metaQuestions")}: ${questions}`);
    parts.push(
      `${t("admin.taxonomy.durationMinutes")}: ${subtest.durationMinutes ?? t("admin.taxonomy.untimed")}`,
    );
    if (subtest.passingGrade !== null) {
      parts.push(`${t("admin.taxonomy.passingGrade")}: ${subtest.passingGrade}`);
    }
  } else {
    const category = item as Category;
    parts.push(`${t("admin.taxonomy.metaPackages")}: ${db.packages.filter((pkg) => pkg.categoryId === category.id).length}`);
  }

  return <p className="text-[0.6875rem] text-muted-foreground">{parts.join(" · ")}</p>;
}
