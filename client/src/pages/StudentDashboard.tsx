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
  Mic,
  Award,
  Building,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { LoadingPage } from "@/components/LoadingSpinner";
import { MobileHeader } from "@/components/MobileHeader";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { MobileNav } from "@/components/MobileNav";
import { StudentFormDialog } from "@/components/StudentFormDialog";
import { EvidenceDetailDialog } from "@/components/EvidenceDetailDialog";
import type { Student, EvidenceWithOutcomes, StudentPLUCoverage } from "@shared/schema";
import { cn } from "@/lib/utils";

const evidenceTypeIcons: Record<string, typeof Camera> = {
  photo: Camera,
  video: Video,
  work_sample: FileText,
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

  const { data: pluCoverage, isLoading: coverageLoading } = useQuery<StudentPLUCoverage>({
    queryKey: ["/api/students", id, "plu-coverage"],
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

  const missingOutcomes = pluCoverage?.missingOutcomes || [];
  const weakOutcomes = pluCoverage?.weakOutcomes || [];
  const plusOnTrack = pluCoverage?.plusCoverage.filter(p => p.isOnTrackForJCPA).length || 0;
  const totalPlus = pluCoverage?.plusCoverage.length || 5;

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
                {student.yearGroup && (
                  <span className="text-sm text-muted-foreground">{student.yearGroup}</span>
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
                  <Award className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{plusOnTrack}/{totalPlus}</p>
                  <p className="text-xs text-muted-foreground">PLUs Ready</p>
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
                  <p className="text-xs text-muted-foreground">Missing</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-accent flex items-center justify-center">
                  <span className="text-sm font-bold text-accent-foreground">{pluCoverage?.overallPercentage || 0}%</span>
                </div>
                <div>
                  <p className="text-2xl font-bold">{pluCoverage?.overallPercentage || 0}%</p>
                  <p className="text-xs text-muted-foreground">Coverage</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
              <TabsTrigger value="evidence" data-testid="tab-evidence">Evidence</TabsTrigger>
              <TabsTrigger value="ssp" data-testid="tab-ssp">SSP</TabsTrigger>
              <TabsTrigger value="planning" data-testid="tab-planning">Planning</TabsTrigger>
              <TabsTrigger value="scheme" data-testid="tab-scheme">Scheme</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    PLU Coverage Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pluCoverage?.plusCoverage.map((plu) => (
                      <div key={plu.pluNumber} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">PLU {plu.pluNumber}</span>
                            <span className="text-sm text-muted-foreground truncate">{plu.pluName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{plu.percentage}%</span>
                            {plu.isOnTrackForJCPA ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-amber-500" />
                            )}
                          </div>
                        </div>
                        <Progress value={plu.percentage} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-destructive" />
                      Missing Outcomes ({missingOutcomes.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {missingOutcomes.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No missing outcomes - great coverage!</p>
                    ) : (
                      <ScrollArea className="h-40">
                        <div className="space-y-2">
                          {missingOutcomes.slice(0, 10).map((outcome) => (
                            <div key={outcome.id} className="text-sm p-2 rounded-md bg-muted">
                              <span className="font-medium">{outcome.outcomeCode}</span>
                              <span className="text-muted-foreground ml-2 truncate">{outcome.outcomeText}</span>
                            </div>
                          ))}
                          {missingOutcomes.length > 10 && (
                            <p className="text-sm text-muted-foreground">+{missingOutcomes.length - 10} more</p>
                          )}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-amber-500" />
                      Weak Outcomes ({weakOutcomes.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {weakOutcomes.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No weak outcomes - solid evidence base!</p>
                    ) : (
                      <ScrollArea className="h-40">
                        <div className="space-y-2">
                          {weakOutcomes.slice(0, 10).map(({ outcome, count }) => (
                            <div key={outcome.id} className="text-sm p-2 rounded-md bg-muted flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <span className="font-medium">{outcome.outcomeCode}</span>
                                <span className="text-muted-foreground ml-2 truncate">{outcome.outcomeText}</span>
                              </div>
                              <Badge variant="outline" className="flex-shrink-0">{count}</Badge>
                            </div>
                          ))}
                          {weakOutcomes.length > 10 && (
                            <p className="text-sm text-muted-foreground">+{weakOutcomes.length - 10} more</p>
                          )}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

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
                              <Badge variant="secondary" className="capitalize flex items-center gap-1">
                                {evidence.setting === "classroom" ? (
                                  <Building className="h-3 w-3" />
                                ) : (
                                  <MapPin className="h-3 w-3" />
                                )}
                                {evidence.setting}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                              {evidence.assessmentActivity || evidence.observations || "No description"}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                              {evidence.outcomes?.slice(0, 3).map((outcome) => (
                                <Badge key={outcome.id} variant="secondary" className="text-xs">
                                  {outcome.outcomeCode}
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

            <TabsContent value="ssp" className="space-y-4">
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">Student Support Plan</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Document key needs, strengths, communication supports, targets, and strategies for this student.
                  </p>
                  <Button data-testid="button-create-ssp">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Support Plan
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="planning" className="space-y-4">
              <Card>
                <CardContent className="p-8 text-center">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">Weekly Planning</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Plan weekly activities and link evidence to track progress toward learning outcomes.
                  </p>
                  <Button data-testid="button-create-plan">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Weekly Plan
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="scheme" className="space-y-4">
              <Card>
                <CardContent className="p-8 text-center">
                  <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">Scheme of Work</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    View and manage curriculum schemes assigned to this student or their class group.
                  </p>
                  <Button variant="outline" data-testid="button-view-schemes">
                    View Assigned Schemes
                  </Button>
                </CardContent>
              </Card>
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
