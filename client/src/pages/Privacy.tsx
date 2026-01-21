import { GraduationCap, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Link } from "wouter";

export default function Privacy() {
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

        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
        
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">Last updated: January 2026</p>

          <section>
            <h2 className="text-xl font-semibold mb-3">Overview</h2>
            <p className="text-muted-foreground">
              L2LP Tracker is designed with privacy as a priority. We understand that schools handle sensitive student information, and we are committed to protecting that data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Data We Collect</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Account Information:</strong> Name and email address for authentication</li>
              <li><strong>Student Data:</strong> Student names and learning programme information as entered by your school</li>
              <li><strong>Evidence Files:</strong> Photos, videos, and documents uploaded to track learning outcomes</li>
              <li><strong>Usage Data:</strong> Basic analytics to improve the service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">How We Use Your Data</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>To provide the evidence tracking service to your school</li>
              <li>To authenticate users and manage access permissions</li>
              <li>To improve and maintain the platform</li>
              <li>We do not sell or share your data with third parties</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Data Security</h2>
            <p className="text-muted-foreground">
              All data is encrypted in transit and at rest. Access to student data is restricted to members of your school organisation with appropriate permissions. We use industry-standard security practices to protect your information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">School Data Ownership</h2>
            <p className="text-muted-foreground">
              Your school retains full ownership of all student data and evidence files. You can export or delete your data at any time. When you delete data, it is permanently removed from our systems.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Contact</h2>
            <p className="text-muted-foreground">
              For privacy-related questions or requests, please contact us at{" "}
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
