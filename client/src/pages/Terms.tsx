import { GraduationCap, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Link } from "wouter";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link href="/" data-testid="link-logo-home">
            <div className="flex items-center gap-3 hover-elevate rounded-md p-1 -m-1 cursor-pointer">
              <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg">L2LP Tracker</span>
            </div>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <Button variant="ghost" size="sm" asChild className="mb-6" data-testid="button-back-home">
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
        </Button>

        <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
        
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">Last updated: January 2026</p>

          <section>
            <h2 className="text-xl font-semibold mb-3">Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing or using L2LP Tracker, you agree to be bound by these Terms of Service. If you are using the service on behalf of a school or organisation, you represent that you have authority to bind that organisation to these terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Description of Service</h2>
            <p className="text-muted-foreground">
              L2LP Tracker is a web-based application designed to help Irish SEN teachers track student evidence against NCCA Level 1 and Level 2 Learning Programme outcomes. The service includes evidence upload, outcome tagging, and coverage reporting features.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">User Responsibilities</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>You are responsible for maintaining the confidentiality of your account</li>
              <li>You agree to use the service only for lawful educational purposes</li>
              <li>You are responsible for ensuring appropriate consent for any student data you upload</li>
              <li>You agree not to upload inappropriate, offensive, or illegal content</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Intellectual Property</h2>
            <p className="text-muted-foreground">
              L2LP Tracker and its original content, features, and functionality are owned by Billy Cronin. The NCCA learning outcome content is sourced from publicly available curriculum documents and remains the intellectual property of the NCCA.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Data and Content</h2>
            <p className="text-muted-foreground">
              You retain ownership of all content you upload to the service. By uploading content, you grant us a limited license to store, display, and process that content solely for the purpose of providing the service to you.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Limitation of Liability</h2>
            <p className="text-muted-foreground">
              The service is provided "as is" without warranties of any kind. We shall not be liable for any indirect, incidental, or consequential damages arising from your use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Changes to Terms</h2>
            <p className="text-muted-foreground">
              We reserve the right to modify these terms at any time. We will notify users of significant changes via email or through the application.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Contact</h2>
            <p className="text-muted-foreground">
              For questions about these terms, please contact us at{" "}
              <a href="mailto:contact@l2lpevidence.com" className="text-primary hover:underline" data-testid="link-contact-email">
                contact@l2lpevidence.com
              </a>
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t bg-background mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>© 2026 Billy Cronin. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
