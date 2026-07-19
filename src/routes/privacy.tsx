import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — JB Design" },
      {
        name: "description",
        content: "JB Design privacy policy for WhatsApp Business API lead messaging.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
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
            Meta Compliant Policy
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-sm sm:p-12">
          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Effective Date: June 20, 2026 | Last updated: {new Date().toLocaleDateString()}
          </p>

          <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-foreground">
                1. Introduction
              </h2>
              <p>
                JB Design ("we", "our", or "us") operates the Pulse CRM platform. We are committed
                to protecting the privacy and security of your personal data. This Privacy Policy
                explains how we collect, use, and safeguard information when you interact with our
                services, including automatic notifications sent via the Meta WhatsApp Cloud API.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-foreground">
                2. Information We Collect
              </h2>
              <p>
                When inquiries are submitted via Justdial, our website, or connected lead intake
                webhooks, we collect basic contact information to provide prompt support:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Name / Contact person</li>
                <li>Mobile number (for WhatsApp messaging)</li>
                <li>Email address</li>
                <li>City or region</li>
                <li>Details of your service inquiry</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-foreground">
                3. How We Use Your Information
              </h2>
              <p>We use the collected information to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Respond immediately to your customer inquiries.</li>
                <li>
                  Deliver welcome messages and automated updates via the WhatsApp Business Platform.
                </li>
                <li>Manage and track message delivery status (e.g., sent, delivered, read).</li>
              </ul>
              <p className="italic">
                We do not sell, rent, trade, or share your personal data with third-party marketers.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-foreground">
                4. Data Protection & Security
              </h2>
              <p>
                We implement industry-standard database encryption and access controls within our
                Supabase database infrastructure to prevent unauthorized access, alteration, or
                disclosure of your personal information.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-foreground">
                5. User Rights & Data Deletion
              </h2>
              <p>
                You have the right to request access to or deletion of your personal data at any
                time. To delete your contact information from our active messaging databases, please
                visit our dedicated{" "}
                <a href="/data-deletion" className="font-medium text-primary hover:underline">
                  Data Deletion Instructions Page
                </a>{" "}
                or contact our support desk directly at{" "}
                <a
                  href="mailto:kathan21042007@gmail.com"
                  className="font-medium text-primary hover:underline"
                >
                  kathan21042007@gmail.com
                </a>
                . We will honor your deletion request within 24–48 hours.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
