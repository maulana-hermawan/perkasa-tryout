// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useParams: () => ({}),
}));

import { I18nProvider } from "@/lib/i18n";
import QuestionForm from "./question-form";

afterEach(cleanup);

/**
 * Smoke test for the question editor: Tiptap mounts inside jsdom, the toolbar
 * and the type-specific fields render.
 *
 * jsdom reports `en-US`, so the labels are asserted in English.
 */
describe("QuestionForm", () => {
  it("renders the editor shell for a new question", async () => {
    render(
      <I18nProvider>
        <QuestionForm />
      </I18nProvider>,
    );

    expect(screen.getByText("New question")).toBeTruthy();
    expect(screen.getByLabelText("Question type")).toBeTruthy();
    expect(screen.getByLabelText("Subtest")).toBeTruthy();
    // One toolbar for the prompt plus one per answer option.
    expect(screen.getAllByLabelText("Bold").length).toBeGreaterThanOrEqual(5);
    expect(screen.getAllByLabelText("Formula").length).toBeGreaterThanOrEqual(5);

    // Multiple choice is the default → four answer options.
    await waitFor(() => {
      expect(screen.getAllByLabelText(/^Answer key/).length).toBe(4);
    });
  });
});
