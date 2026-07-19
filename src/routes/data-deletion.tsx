import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/data-deletion")({
  head: () => ({
    meta: [
      { title: "Data Deletion — JB Design" },
      { name: "description", content: "Request deletion of your data from JB Design systems." },
    ],
  }),
  component: DataDeletionPage,
});

function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-muted/30 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between">
          <a
            href="/"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Home
          </a>
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            Data Deletion Standard
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-sm sm:p-12">
          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Data Deletion Instructions
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Follow these simple steps to request removal of your personal information from our CRM
            systems.
          </p>

          <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
            <p>
              JB Design values your data privacy. In compliance with the Meta WhatsApp Platform
              Terms, we provide a clean and straightforward process for users and customers to
              request the complete removal of their personal details (such as names, phone numbers,
              and message logs) from our active databases.
            </p>

            <div className="rounded-lg border border-border bg-muted/20 p-6 space-y-4">
              <h3 className="font-display text-base font-semibold text-foreground">
                How to Request Deletion:
              </h3>
              <ol className="list-decimal pl-5 space-y-3">
                <li>
                  Send an email to{" "}
                  <a
                    href="mailto:kathan21042007@gmail.com"
                    className="font-medium text-primary hover:underline"
                  >
                    kathan21042007@gmail.com
                  </a>{" "}
                  with the subject line <strong>"Data Deletion Request"</strong>.
                </li>
                <li>
                  Provide the **mobile number** (with country code) that received the WhatsApp
                  communications and your **full name**.
                </li>
                <li>
                  Our administration team will locate your record, remove it from our active CRM
                  database, and delete any associated message logs within{" "}
                  <strong>24–48 hours</strong>.
                </li>
              </ol>
            </div>

            <p className="text-xs text-muted-foreground pt-4 border-t border-border">
              Once processed, you will receive a final confirmation email, and no further automated
              WhatsApp updates or follow-up communications will be dispatched to your phone number.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
