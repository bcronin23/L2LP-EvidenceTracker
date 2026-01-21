import { GraduationCap, Camera, FileText, BarChart3, CheckCircle, Clock, Users, Smartphone, Shield, Zap, Upload, Link2, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";

const features = [
  {
    icon: Camera,
    title: "Capture in Seconds",
    description: "Snap a photo, record a video, or upload a document directly from your phone. No more waiting until you're at a computer.",
    benefit: "Save 10+ minutes per evidence",
  },
  {
    icon: FileText,
    title: "Smart Outcome Linking",
    description: "Tag evidence with learning outcomes across all 4 NCCA programmes. Search and filter to find exactly what you need.",
    benefit: "600+ outcomes supported",
  },
  {
    icon: BarChart3,
    title: "Instant Coverage Reports",
    description: "See at a glance which outcomes have evidence and where the gaps are. No more manual tallying or colour-coding.",
    benefit: "Inspection-ready in clicks",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Share evidence across your SEN team. Staff can upload, admins can manage. Everyone stays aligned.",
    benefit: "Built for SEN teams",
  },
];

const programmes = [
  { code: "JC L1LP", name: "Junior Cycle Level 1", outcomes: "183" },
  { code: "JC L2LP", name: "Junior Cycle Level 2", outcomes: "196" },
  { code: "SC L1LP", name: "Senior Cycle Level 1", outcomes: "215" },
  { code: "SC L2LP", name: "Senior Cycle Level 2", outcomes: "282" },
];

const steps = [
  {
    icon: Upload,
    step: "1",
    title: "Upload Evidence",
    description: "Take a photo or video during class, or upload existing files. Works on any device.",
  },
  {
    icon: Link2,
    step: "2",
    title: "Link to Outcomes",
    description: "Select the student and tag the relevant learning outcomes. Our smart search helps you find them fast.",
  },
  {
    icon: ClipboardCheck,
    step: "3",
    title: "Track & Report",
    description: "View coverage by student or outcome. Generate reports for inspections, reviews, or parent meetings.",
  },
];

const stats = [
  { value: "876", label: "Learning Outcomes", sublabel: "Across all 4 programmes" },
  { value: "80%", label: "Time Saved", sublabel: "vs. spreadsheet tracking" },
  { value: "100%", label: "Mobile Ready", sublabel: "Works on any device" },
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

      <main>
        <section className="max-w-7xl mx-auto px-4 py-12 md:py-20 text-center">
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {programmes.map((prog) => (
              <Badge key={prog.code} variant="secondary" className="text-xs">
                {prog.code}
              </Badge>
            ))}
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            Evidence Tracking Made
            <br />
            <span className="text-primary">Simple for Teachers</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-4">
            Stop wrestling with spreadsheets. Capture evidence on your phone, link it to NCCA outcomes, and see student progress at a glance.
          </p>
          <p className="text-base text-muted-foreground max-w-xl mx-auto mb-8">
            Supporting <strong>L1LP and L2LP</strong> for both Junior and Senior Cycle programmes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" asChild data-testid="button-get-started">
              <a href="/api/login">Get Started Free</a>
            </Button>
            <Button size="lg" variant="outline" asChild data-testid="button-learn-more">
              <a href="#how-it-works">See How It Works</a>
            </Button>
          </div>
        </section>

        <section className="border-y bg-muted/50">
          <div className="max-w-7xl mx-auto px-4 py-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <p className="text-3xl md:text-4xl font-bold">{stat.value}</p>
                  <p className="font-medium mt-1">{stat.label}</p>
                  <p className="text-sm text-muted-foreground">{stat.sublabel}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              Built for Every Programme
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Full support for all four NCCA Level 1 and Level 2 Learning Programmes with the complete curriculum structure.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {programmes.map((prog) => (
              <Card key={prog.code} className="text-center">
                <CardContent className="p-6">
                  <Badge className="mb-3">{prog.code}</Badge>
                  <h3 className="font-semibold mb-1">{prog.name}</h3>
                  <p className="text-2xl font-bold text-primary">{prog.outcomes}</p>
                  <p className="text-xs text-muted-foreground">learning outcomes</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="bg-muted/30 border-y">
          <div className="max-w-7xl mx-auto px-4 py-16">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">
                How It Works
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                From capture to report in three simple steps. No training required.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {steps.map((step) => (
                <div key={step.step} className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 relative">
                    <step.icon className="h-7 w-7 text-primary" />
                    <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                      {step.step}
                    </span>
                  </div>
                  <h3 className="font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              Save Hours Every Week
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Purpose-built features that let you focus on teaching, not paperwork.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="border">
                <CardContent className="p-6 flex gap-4">
                  <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold">{feature.title}</h3>
                      <Badge variant="secondary" className="text-xs flex-shrink-0">
                        {feature.benefit}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="bg-accent/30 border-y">
          <div className="max-w-7xl mx-auto px-4 py-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Smartphone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Works Everywhere</h3>
                  <p className="text-sm text-muted-foreground">
                    Phone, tablet, Chromebook, or desktop. Capture evidence wherever learning happens.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Secure & Private</h3>
                  <p className="text-sm text-muted-foreground">
                    Student data stays within your school. Role-based access keeps information safe.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">No Training Needed</h3>
                  <p className="text-sm text-muted-foreground">
                    Intuitive design means your team can start capturing evidence in minutes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            Ready to Simplify Evidence Tracking?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">
            Join Irish SEN teachers who've replaced spreadsheets with a tool that actually works the way they do.
          </p>
          <Button size="lg" asChild data-testid="button-cta-bottom">
            <a href="/api/login">Get Started Free</a>
          </Button>
        </section>

        <section className="border-t bg-muted/50">
          <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Who It's For</h3>
                <p className="text-sm text-muted-foreground">
                  Designed for L1LP/L2LP teachers and SEN teams in Irish schools.
                </p>
              </div>
              <div>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">What It Does</h3>
                <p className="text-sm text-muted-foreground">
                  Capture evidence, link to outcomes, and track coverage — all in one place.
                </p>
              </div>
              <div>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Privacy First</h3>
                <p className="text-sm text-muted-foreground">
                  School-friendly privacy and role-based access controls built in.
                </p>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t bg-background">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex flex-col items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                  <GraduationCap className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-medium text-foreground">L2LP Tracker</span>
              </div>
              <p className="text-center">© 2026 Billy Cronin. All rights reserved.</p>
              <div className="flex flex-wrap justify-center gap-4">
                <a href="/privacy" className="hover:text-foreground transition-colors" data-testid="link-privacy">Privacy Policy</a>
                <a href="/terms" className="hover:text-foreground transition-colors" data-testid="link-terms">Terms</a>
                <a href="mailto:contact@l2lpevidence.com" className="hover:text-foreground transition-colors" data-testid="link-contact">Contact</a>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
