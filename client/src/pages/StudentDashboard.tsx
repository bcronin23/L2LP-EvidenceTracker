import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { format } from "date-fns";
import {
  ArrowLeft,
  Edit,
  Plus,
  FileText,
  CheckCircle,
  AlertCircle,
  Calendar,
  Camera,
  Video,
  File,
  Eye,
  Mic,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingPage } from "@/components/LoadingSpinner";
import { MobileHeader } from "@/components/MobileHeader";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { MobileNav } from "@/components/MobileNav";
import { StudentFormDialog } from "@/components/StudentFormDialog";
import { EvidenceDetailDialog } from "@/components/EvidenceDetailDialog";
import type { Student, EvidenceWithOutcomes, OutcomeCoverage } from "@shared/schema";
import { cn } from "@/lib/utils";

const evidenceTypeIcons: Record<string, typeof Camera> = {
  photo: Camera,
  video: Video,
  work_sample: FileText,
  observation: Eye,
  audio: Mic,
  other: File,
};

export default function StudentDashboard() {
  const { id } = useParams<{ id: string }>();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceWithOutcomes | null>(null);

  const { data: student, isLoading: studentLoading } = useQuery<Student>({
    queryKey: ["/api/students", id],
  });

  const { data: evidenceList, isLoading: evidenceLoading } = useQuery<EvidenceWithOutcomes[]>({
    queryKey: ["/api/students", id, "evidence"],
    enabled: !!id,
  });

  const { data: coverage, isLoading: coverageLoading } = useQuery<OutcomeCoverage[]>({
    queryKey: ["/api/students", id, "coverage"],
    enabled: !!id,
  });

  const isLoading = studentLoading || evidenceLoading || coverageLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background">
        <DesktopSidebar />
        <div className="flex-1">
          <LoadingPage />
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex min-h-screen bg-background">
        <DesktopSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Student not found</h2>
            <Link href="/students">
              <Button variant="outline">Back to Students</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const missingOutcomes = coverage?.filter((c) => c.evidenceCount === 0) || [];
  const coveredOutcomes = coverage?.filter((c) => c.evidenceCount > 0) || [];
  const totalOutcomes = coverage?.length || 0;
  const coveragePercent = totalOutcomes > 0 ? Math.round((coveredOutcomes.length / totalOutcomes) * 100) : 0;

  return (
    <div className="flex min-h-screen bg-background">
      <DesktopSidebar />

      <div className="flex-1 flex flex-col pb-20 md:pb-0">
        <MobileHeader title={`${student.firstName} ${student.lastName}`} />

        <div className="hidden md:flex items-center justify-between gap-4 p-6 border-b">
          <div className="flex items-center gap-4">
            <Link href="/students">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-semibold">
                {student.firstName} {student.lastName}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                {student.classGroup && (
                  <Badge variant="secondary">{student.classGroup}</Badge>
                )}
                {student.year && (
                  <span className="text-sm text-muted-foreground">{student.year}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(true)} data-testid="button-edit-student">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Link href={`/upload?student=${id}`}>
              <Button data-testid="button-add-evidence">
                <Plus className="h-4 w-4 mr-2" />
                Add Evidence
              </Button>
            </Link>
          </div>
        </div>

        <main className="flex-1 p-4 md:p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-accent flex items-center justify-center">
                  <FileText className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{evidenceList?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Evidence Items</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{coveredOutcomes.length}</p>
                  <p className="text-xs text-muted-foreground">Outcomes Covered</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{missingOutcomes.length}</p>
                  <p className="text-xs text-muted-foreground">Missing Outcomes</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-accent flex items-center justify-center">
                  <span className="text-sm font-bold text-accent-foreground">{coveragePercent}%</span>
                </div>
                <div>
                  <p className="text-2xl font-bold">{coveragePercent}%</p>
                  <p className="text-xs text-muted-foreground">Coverage</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="evidence" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="evidence" data-testid="tab-evidence">Evidence</TabsTrigger>
              <TabsTrigger value="coverage" data-testid="tab-coverage">Coverage</TabsTrigger>
              <TabsTrigger value="missing" data-testid="tab-missing">Missing</TabsTrigger>
            </TabsList>

            <TabsContent value="evidence" className="space-y-4">
              {evidenceList?.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium mb-2">No evidence yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Start capturing evidence for this student
                    </p>
                    <Link href={`/upload?student=${id}`}>
                      <Button data-testid="button-first-evidence">
                        <Plus className="h-4 w-4 mr-2" />
                        Add First Evidence
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {evidenceList?.map((evidence) => {
                    const Icon = evidenceTypeIcons[evidence.evidenceType] || File;
                    return (
                      <Card
                        key={evidence.id}
                        className="hover-elevate cursor-pointer"
                        onClick={() => setSelectedEvidence(evidence)}
                        data-testid={`card-evidence-${evidence.id}`}
                      >
                        <CardContent className="p-4 flex items-start gap-4">
                          <div className="w-12 h-12 rounded-md bg-accent flex items-center justify-center flex-shrink-0">
                            <Icon className="h-6 w-6 text-accent-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <Badge variant="outline" className="capitalize">
                                {evidence.evidenceType.replace("_", " ")}
                              </Badge>
                              <Badge variant="secondary" className="capitalize">
                                {evidence.independenceLevel}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                              {evidence.notes || "No notes"}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                              {evidence.outcomes?.slice(0, 3).map((outcome) => (
                                <Badge key={outcome.id} variant="secondary" className="text-xs">
                                  {outcome.code}
                                </Badge>
                              ))}
                              {(evidence.outcomes?.length || 0) > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{evidence.outcomes!.length - 3}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(evidence.dateOfActivity), "dd MMM")}
                            </p>
                            {evidence.staffInitials && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {evidence.staffInitials}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="coverage">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Outcome Coverage</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[400px]">
                    <div className="divide-y">
                      {coverage?.map((item) => (
                        <div
                          key={item.outcome.id}
                          className="p-4 flex items-start gap-4"
                          data-testid={`coverage-${item.outcome.code}`}
                        >
                          <Badge
                            className={cn(
                              "flex-shrink-0",
                              item.evidenceCount === 0
                                ? "bg-destructive text-destructive-foreground"
                                : item.evidenceCount < 3
                                ? "bg-amber-500 text-white"
                                : "bg-primary text-primary-foreground"
                            )}
                          >
                            {item.outcome.code}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium mb-1">{item.outcome.strand}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {item.outcome.description}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-medium">{item.evidenceCount}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.lastEvidenceDate
                                ? format(new Date(item.lastEvidenceDate), "dd MMM")
                                : "Never"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="missing">
              {missingOutcomes.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <CheckCircle className="h-12 w-12 mx-auto text-primary mb-4" />
                    <h3 className="font-medium mb-2">All outcomes covered!</h3>
                    <p className="text-sm text-muted-foreground">
                      Great job! This student has evidence for all learning outcomes.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {missingOutcomes.map((item) => (
                    <Card key={item.outcome.id} className="border-destructive/20" data-testid={`missing-${item.outcome.code}`}>
                      <CardContent className="p-4 flex items-start gap-4">
                        <Badge variant="destructive" className="flex-shrink-0">
                          {item.outcome.code}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium mb-1">{item.outcome.strand}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {item.outcome.description}
                          </p>
                        </div>
                        <Link href={`/upload?student=${id}&outcome=${item.outcome.id}`}>
                          <Button size="sm" variant="outline" data-testid={`button-add-evidence-${item.outcome.code}`}>
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </main>

        <Link href={`/upload?student=${id}`}>
          <Button
            className="fixed bottom-24 right-4 md:hidden rounded-full h-14 w-14 shadow-lg"
            size="icon"
            data-testid="fab-add-evidence"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </Link>

        <MobileNav />
      </div>

      <StudentFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        student={student}
      />

      <EvidenceDetailDialog
        evidence={selectedEvidence}
        onClose={() => setSelectedEvidence(null)}
      />
    </div>
  );
}
