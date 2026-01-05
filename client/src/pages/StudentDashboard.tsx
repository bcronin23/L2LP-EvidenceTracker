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
  ChevronDown,
  ChevronRight,
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
  const [expandedPLUs, setExpandedPLUs] = useState<Set<number>>(new Set([1, 2, 3, 4, 5]));

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

  const togglePLU = (pluNumber: number) => {
    setExpandedPLUs((prev) => {
      const next = new Set(prev);
      if (next.has(pluNumber)) {
        next.delete(pluNumber);
      } else {
        next.add(pluNumber);
      }
      return next;
    });
  };

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

          <Tabs defaultValue="evidence" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="evidence" data-testid="tab-evidence">Evidence</TabsTrigger>
              <TabsTrigger value="plu" data-testid="tab-plu">PLU Status</TabsTrigger>
              <TabsTrigger value="missing" data-testid="tab-missing">Missing</TabsTrigger>
              <TabsTrigger value="weak" data-testid="tab-weak">Weak</TabsTrigger>
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

            <TabsContent value="plu" className="space-y-4">
              {pluCoverage?.plusCoverage.map((plu) => (
                <Card key={plu.pluNumber} data-testid={`plu-coverage-${plu.pluNumber}`}>
                  <button
                    type="button"
                    className="w-full p-4 flex items-center gap-3 text-left hover-elevate rounded-t-md"
                    onClick={() => togglePLU(plu.pluNumber)}
                  >
                    {expandedPLUs.has(plu.pluNumber) ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    )}
                    <Badge variant="outline" className="font-mono flex-shrink-0">
                      PLU {plu.pluNumber}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{plu.pluName}</p>
                      <p className="text-xs text-muted-foreground">
                        {plu.evidencedOutcomes}/{plu.totalOutcomes} outcomes covered
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 hidden sm:block">
                        <Progress value={plu.percentage} className="h-2" />
                      </div>
                      {plu.isOnTrackForJCPA ? (
                        <Badge className="bg-green-600 text-white flex-shrink-0">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          JCPA Ready
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="flex-shrink-0">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Needs Work
                        </Badge>
                      )}
                    </div>
                  </button>

                  {expandedPLUs.has(plu.pluNumber) && (
                    <CardContent className="pt-0 pb-4 space-y-3">
                      {plu.elements.map((element) => (
                        <div key={element.elementName} className="ml-8 p-3 rounded-md bg-muted/50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">{element.elementName}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {element.evidencedOutcomes}/{element.totalOutcomes}
                              </span>
                              {element.hasMajority ? (
                                <Badge size="sm" className="bg-green-600/20 text-green-600 border-green-600/30">
                                  Majority
                                </Badge>
                              ) : (
                                <Badge size="sm" variant="outline" className="text-amber-600 border-amber-600/30">
                                  {element.percentage}%
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Progress value={element.percentage} className="h-1" />
                        </div>
                      ))}
                    </CardContent>
                  )}
                </Card>
              ))}
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
                  {missingOutcomes.map((outcome) => (
                    <Card key={outcome.id} className="border-destructive/20" data-testid={`missing-${outcome.outcomeCode}`}>
                      <CardContent className="p-4 flex items-start gap-4">
                        <Badge variant="destructive" className="flex-shrink-0 font-mono">
                          {outcome.outcomeCode}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium mb-1">{outcome.pluName}</p>
                          <p className="text-xs text-muted-foreground mb-1">{outcome.elementName}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {outcome.outcomeText}
                          </p>
                        </div>
                        <Link href={`/upload?student=${id}&outcome=${outcome.id}`}>
                          <Button size="sm" variant="outline" data-testid={`button-add-evidence-${outcome.outcomeCode}`}>
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

            <TabsContent value="weak">
              {weakOutcomes.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <CheckCircle className="h-12 w-12 mx-auto text-primary mb-4" />
                    <h3 className="font-medium mb-2">No weak outcomes!</h3>
                    <p className="text-sm text-muted-foreground">
                      All covered outcomes have multiple evidence items.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    These outcomes have only 1 evidence item. Consider adding more.
                  </p>
                  {weakOutcomes.map(({ outcome, count }) => (
                    <Card key={outcome.id} className="border-amber-500/20" data-testid={`weak-${outcome.outcomeCode}`}>
                      <CardContent className="p-4 flex items-start gap-4">
                        <Badge className="flex-shrink-0 font-mono bg-amber-500 text-white">
                          {outcome.outcomeCode}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium mb-1">{outcome.pluName}</p>
                          <p className="text-xs text-muted-foreground mb-1">{outcome.elementName}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {outcome.outcomeText}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">{count} item</Badge>
                          <Link href={`/upload?student=${id}&outcome=${outcome.id}`}>
                            <Button size="sm" variant="ghost" className="mt-2">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
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
