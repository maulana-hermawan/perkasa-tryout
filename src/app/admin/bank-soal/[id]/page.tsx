"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

import { useDatabase, useDbHydrated } from "@/lib/store/db";
import { PageLoader } from "@/components/common/page-loader";
import QuestionForm from "@/components/admin/question-form";

export default function AdminEditQuestionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const db = useDatabase();
  const hydrated = useDbHydrated();
  const question = db.questions.find((item) => item.id === params.id);

  useEffect(() => {
    if (hydrated && !question) router.replace("/admin/bank-soal");
  }, [hydrated, question, router]);

  if (!hydrated) return <PageLoader />;
  if (!question) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  return <QuestionForm question={question} />;
}
