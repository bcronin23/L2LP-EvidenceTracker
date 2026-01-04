import { GraduationCap, Camera, FileText, BarChart3, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";

const features = [
  {
    icon: Camera,
    title: "Capture Evidence",
    description: "Upload photos, videos, and documents directly from your phone or Chromebook",
  },
  {
    icon: FileText,
    title: "Link to Outcomes",
    description: "Tag evidence with L2LP learning outcomes for comprehensive tracking",
  },
  {
    icon: BarChart3,
    title: "Track Coverage",
    description: "See which outcomes have evidence and identify gaps at a glance",
  },
  {
    icon: CheckCircle,
    title: "Stay Organised",
    description: "Filter and search your evidence library by student, date, or outcome",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">L2LP Tracker</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild data-testid="button-login">
              <a href="/api/login">Sign In</a>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12 md:py-20">
        <section className="text-center mb-16">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            Evidence Tracking for
            <br />
            <span className="text-primary">Level 2 Learning Programme</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Replace spreadsheets with a simple, mobile-friendly tool to capture, organise, and track student evidence against L2LP learning outcomes.
          </p>
          <Button size="lg" asChild data-testid="button-get-started">
            <a href="/api/login">Get Started</a>
          </Button>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {features.map((feature) => (
            <Card key={feature.title} className="border">
              <CardContent className="p-6 flex gap-4">
                <div className="w-12 h-12 rounded-md bg-accent flex items-center justify-center flex-shrink-0">
                  <feature.icon className="h-6 w-6 text-accent-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="text-center py-12 border-t">
          <p className="text-sm text-muted-foreground">
            Designed for Irish SEN teachers. Works on phone, tablet, and Chromebook.
          </p>
        </section>
      </main>
    </div>
  );
}
