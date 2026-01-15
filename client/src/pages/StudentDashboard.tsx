import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { format, startOfWeek, addDays } from "date-fns";
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
  History,
  ClipboardList,
  Download,
  Trash2,
  LinkIcon,
  Grid,
  List,
  Play,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { LoadingPage, LoadingSpinner } from "@/components/LoadingSpinner";
import { MobileHeader } from "@/components/MobileHeader";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { MobileNav } from "@/components/MobileNav";
import { StudentFormDialog } from "@/components/StudentFormDialog";
import { EvidenceDetailDialog } from "@/components/EvidenceDetailDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Student, EvidenceWithOutcomes, StudentPLUCoverage, StudentSupportPlanWithAttachments, StudentPlanWithEvidence, SchemeOfWorkWithStudents, LearningOutcome, Programme } from "@shared/schema";
import { ProgrammeOverridesManager } from "@/components/ProgrammeOverridesManager";
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
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceWithOutcomes | null>(null);
  const [sspDialogOpen, setSspDialogOpen] = useState(false);
  const [evidenceViewMode, setEvidenceViewMode] = useState<"timeline" | "gallery">("timeline");
  const [galleryFilter, setGalleryFilter] = useState<"all" | "photo" | "video">("all");
  const [editingSsp, setEditingSsp] = useState<StudentSupportPlanWithAttachments | null>(null);
  const [showSspHistory, setShowSspHistory] = useState(false);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<StudentPlanWithEvidence | null>(null);
  const [schemeDialogOpen, setSchemeDialogOpen] = useState(false);

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

  const { data: ssps, isLoading: sspLoading } = useQuery<StudentSupportPlanWithAttachments[]>({
    queryKey: ["/api/students", id, "ssp"],
    enabled: !!id,
  });

  const { data: plans, isLoading: plansLoading } = useQuery<StudentPlanWithEvidence[]>({
    queryKey: ["/api/students", id, "plans"],
    enabled: !!id,
  });

  const { data: schemes, isLoading: schemesLoading } = useQuery<SchemeOfWorkWithStudents[]>({
    queryKey: ["/api/students", id, "schemes"],
    enabled: !!id,
  });

  const { data: outcomes } = useQuery<LearningOutcome[]>({
    queryKey: ["/api/outcomes"],
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
  const plusOnTrack = pluCoverage?.plusCoverage.filter(p => p.isOnTrackForJCPA).length || 0;
  const totalPlus = pluCoverage?.plusCoverage.length || 5;
  
  // Only show weak outcomes if student has substantial evidence (5+ pieces with photos/videos)
  const totalEvidence = evidenceList?.length || 0;
  const hasMediaEvidence = evidenceList?.some(e => 
    e.evidenceType === "photo" || e.evidenceType === "video"
  ) || false;
  const showWeakOutcomes = totalEvidence >= 5 && hasMediaEvidence;
  const weakOutcomes = showWeakOutcomes ? (pluCoverage?.weakOutcomes || []) : [];
  const activeSsp = ssps?.find(s => s.status === "active");
  
  // Gallery items - filter to photos/videos with files
  const mediaItems = (evidenceList || []).filter(e => 
    (e.evidenceType === "photo" || e.evidenceType === "video") && e.files && e.files.length > 0
  );
  const filteredGalleryItems = galleryFilter === "all" 
    ? mediaItems 
    : mediaItems.filter(e => e.evidenceType === galleryFilter);
  const archivedSsps = ssps?.filter(s => s.status === "archived") || [];
  
  // Create lookup for module codes to titles for badge display
  const moduleCodeToTitle = new Map(
    (outcomes || [])
      .filter(o => o.pluOrModuleCode && o.pluOrModuleTitle)
      .map(o => [o.pluOrModuleCode!, o.pluOrModuleTitle!])
  );
  const getFocusLabel = (focusValue: string) => {
    if (/^\d+$/.test(focusValue)) return `PLU ${focusValue}`;
    return moduleCodeToTitle.get(focusValue) || focusValue;
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEditDialogOpen(true)}
              data-testid="button-edit-student"
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <main className="flex-1 p-4 md:p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{missingOutcomes.length}</p>
                  <p className="text-sm text-muted-foreground">Missing</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-sm font-medium text-muted-foreground">{plusOnTrack}/{totalPlus}</span>
                </div>
                <div>
                  <p className="text-2xl font-bold">{pluCoverage?.overallPercentage || 0}%</p>
                  <p className="text-sm text-muted-foreground">Coverage</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full justify-start gap-1 overflow-x-auto flex-nowrap">
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
                    Coverage Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pluCoverage?.plusCoverage.map((plu) => {
                      const isComplete = plu.percentage === 100;
                      const hasReached50 = plu.isOnTrackForJCPA;
                      
                      return (
                        <div key={plu.pluCode} className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {plu.pluNumber > 0 ? (
                                <>
                                  <span className="font-medium shrink-0">PLU {plu.pluNumber}</span>
                                  <span className="text-sm text-muted-foreground truncate">{plu.pluName}</span>
                                </>
                              ) : (
                                <span className="font-medium truncate">{plu.pluName}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {isComplete ? (
                                <Badge variant="default" className="bg-green-600 text-xs">Complete</Badge>
                              ) : hasReached50 ? (
                                <Badge variant="secondary" className="text-xs">50% Threshold</Badge>
                              ) : null}
                              <span className="text-sm">{plu.percentage}%</span>
                              {isComplete ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : hasReached50 ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-amber-500" />
                              )}
                            </div>
                          </div>
                          <Progress value={plu.percentage} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    Outcomes Needing Evidence ({missingOutcomes.length + weakOutcomes.length})
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Outcomes with no evidence or only 1 piece of evidence
                  </p>
                </CardHeader>
                <CardContent>
                  {missingOutcomes.length === 0 && weakOutcomes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">All outcomes have good coverage!</p>
                  ) : (
                    <ScrollArea className="h-64">
                      <div className="space-y-2">
                        {missingOutcomes.map((outcome) => (
                          <div key={outcome.id} className="text-sm p-3 rounded-md bg-destructive/10 border border-destructive/20">
                            <div className="flex items-start gap-2">
                              <Badge variant="destructive" className="text-xs shrink-0">No evidence</Badge>
                              <div className="min-w-0">
                                <span className="font-medium">{outcome.outcomeCode}</span>
                                <p className="text-muted-foreground text-xs mt-1">{outcome.outcomeText}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                        {weakOutcomes.map(({ outcome, count }) => (
                          <div key={outcome.id} className="text-sm p-3 rounded-md bg-amber-500/10 border border-amber-500/20">
                            <div className="flex items-start gap-2">
                              <Badge variant="outline" className="text-xs shrink-0 border-amber-500 text-amber-600">{count} evidence</Badge>
                              <div className="min-w-0">
                                <span className="font-medium">{outcome.outcomeCode}</span>
                                <p className="text-muted-foreground text-xs mt-1">{outcome.outcomeText}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>

              <ProgrammeOverridesManager student={student} />
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
                <>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Button
                        variant={evidenceViewMode === "timeline" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setEvidenceViewMode("timeline")}
                        data-testid="button-view-timeline"
                      >
                        <List className="h-4 w-4 mr-1" />
                        Timeline
                      </Button>
                      <Button
                        variant={evidenceViewMode === "gallery" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setEvidenceViewMode("gallery")}
                        data-testid="button-view-gallery"
                      >
                        <Grid className="h-4 w-4 mr-1" />
                        Gallery
                      </Button>
                    </div>
                    {evidenceViewMode === "gallery" && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant={galleryFilter === "all" ? "secondary" : "ghost"}
                          size="sm"
                          onClick={() => setGalleryFilter("all")}
                          data-testid="button-filter-all"
                        >
                          All ({mediaItems.length})
                        </Button>
                        <Button
                          variant={galleryFilter === "photo" ? "secondary" : "ghost"}
                          size="sm"
                          onClick={() => setGalleryFilter("photo")}
                          data-testid="button-filter-photos"
                        >
                          <Camera className="h-4 w-4 mr-1" />
                          Photos
                        </Button>
                        <Button
                          variant={galleryFilter === "video" ? "secondary" : "ghost"}
                          size="sm"
                          onClick={() => setGalleryFilter("video")}
                          data-testid="button-filter-videos"
                        >
                          <Video className="h-4 w-4 mr-1" />
                          Videos
                        </Button>
                      </div>
                    )}
                  </div>

                  {evidenceViewMode === "timeline" ? (
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
                  ) : (
                    <>
                      {filteredGalleryItems.length === 0 ? (
                        <Card>
                          <CardContent className="p-8 text-center">
                            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="font-medium mb-2">No photos or videos</h3>
                            <p className="text-sm text-muted-foreground">
                              Upload photos or videos to see them here
                            </p>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {filteredGalleryItems.map((evidence) => (
                            <Card
                              key={evidence.id}
                              className="aspect-square cursor-pointer hover-elevate overflow-hidden"
                              onClick={() => setSelectedEvidence(evidence)}
                              data-testid={`gallery-item-${evidence.id}`}
                            >
                              <CardContent className="p-0 h-full flex flex-col">
                                <div className="flex-1 flex items-center justify-center bg-accent">
                                  {evidence.evidenceType === "photo" ? (
                                    <Camera className="h-12 w-12 text-accent-foreground/50" />
                                  ) : (
                                    <div className="flex flex-col items-center gap-2">
                                      <Play className="h-12 w-12 text-accent-foreground/50" />
                                      <span className="text-xs text-muted-foreground">Video</span>
                                    </div>
                                  )}
                                </div>
                                <div className="p-2 bg-card border-t">
                                  <p className="text-xs text-muted-foreground truncate">
                                    {format(new Date(evidence.dateOfActivity), "dd MMM yyyy")}
                                  </p>
                                  {evidence.outcomes && evidence.outcomes.length > 0 && (
                                    <Badge variant="secondary" className="text-xs mt-1">
                                      {evidence.outcomes.length} outcomes
                                    </Badge>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="ssp" className="space-y-4">
              {sspLoading ? (
                <div className="flex justify-center p-8"><LoadingSpinner /></div>
              ) : activeSsp ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Badge variant="default">Active</Badge>
                      <span className="text-sm text-muted-foreground">
                        Created {format(new Date(activeSsp.createdAt), "dd MMM yyyy")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {archivedSsps.length > 0 && (
                        <Button variant="outline" size="sm" onClick={() => setShowSspHistory(true)} data-testid="button-ssp-history">
                          <History className="h-4 w-4 mr-2" />
                          History ({archivedSsps.length})
                        </Button>
                      )}
                      <Button size="sm" onClick={() => { setEditingSsp(activeSsp); setSspDialogOpen(true); }} data-testid="button-edit-ssp">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                  </div>

                  <SspDisplayCard ssp={activeSsp} />
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium mb-2">Student Support Plan</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Document key needs, strengths, communication supports, targets, and strategies for this student.
                    </p>
                    <Button onClick={() => { setEditingSsp(null); setSspDialogOpen(true); }} data-testid="button-create-ssp">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Support Plan
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="planning" className="space-y-4">
              <div className="flex items-center justify-between gap-2 mb-4">
                <h3 className="font-medium">Weekly Plans</h3>
                <Button size="sm" onClick={() => { setEditingPlan(null); setPlanDialogOpen(true); }} data-testid="button-create-plan">
                  <Plus className="h-4 w-4 mr-2" />
                  New Plan
                </Button>
              </div>
              
              {plansLoading ? (
                <div className="flex justify-center p-8"><LoadingSpinner /></div>
              ) : plans && plans.length > 0 ? (
                <div className="space-y-3">
                  {plans.map((plan) => (
                    <Card key={plan.id} className="hover-elevate cursor-pointer" onClick={() => { setEditingPlan(plan); setPlanDialogOpen(true); }} data-testid={`card-plan-${plan.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">Week of {format(new Date(plan.weekStartDate), "dd MMM yyyy")}</span>
                            </div>
                            {plan.focusPlu && (
                              <Badge variant="secondary" className="mb-2">
                                {getFocusLabel(plan.focusPlu)}
                              </Badge>
                            )}
                            {plan.planText && (
                              <p className="text-sm text-muted-foreground line-clamp-2">{plan.planText}</p>
                            )}
                            {plan.linkedEvidence && plan.linkedEvidence.length > 0 && (
                              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                                <LinkIcon className="h-3 w-3" />
                                {plan.linkedEvidence.length} evidence linked
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium mb-2">Weekly Planning</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Plan weekly activities and link evidence to track progress toward learning outcomes.
                    </p>
                    <Button onClick={() => { setEditingPlan(null); setPlanDialogOpen(true); }} data-testid="button-first-plan">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Weekly Plan
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="scheme" className="space-y-4">
              <div className="flex items-center justify-between gap-2 mb-4">
                <h3 className="font-medium">Assigned Schemes</h3>
                <Button size="sm" onClick={() => setSchemeDialogOpen(true)} data-testid="button-assign-scheme">
                  <Plus className="h-4 w-4 mr-2" />
                  Assign Scheme
                </Button>
              </div>

              {schemesLoading ? (
                <div className="flex justify-center p-8"><LoadingSpinner /></div>
              ) : schemes && schemes.length > 0 ? (
                <div className="space-y-3">
                  {schemes.map((scheme) => (
                    <SchemeCard key={scheme.id} scheme={scheme} studentId={id!} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium mb-2">Scheme of Work</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      No schemes assigned to this student or their class group yet.
                    </p>
                    <Button onClick={() => setSchemeDialogOpen(true)} data-testid="button-first-scheme">
                      <Plus className="h-4 w-4 mr-2" />
                      Assign Scheme
                    </Button>
                  </CardContent>
                </Card>
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

      <SspFormDialog
        open={sspDialogOpen}
        onOpenChange={setSspDialogOpen}
        studentId={id!}
        existingSsp={editingSsp}
      />

      <SspHistoryDialog
        open={showSspHistory}
        onOpenChange={setShowSspHistory}
        ssps={archivedSsps}
      />

      <PlanFormDialog
        open={planDialogOpen}
        onOpenChange={setPlanDialogOpen}
        studentId={id!}
        existingPlan={editingPlan}
        outcomes={outcomes || []}
        studentEvidence={evidenceList || []}
      />

      <SchemeAssignDialog
        open={schemeDialogOpen}
        onOpenChange={setSchemeDialogOpen}
        studentId={id!}
      />
    </div>
  );
}

function SspDisplayCard({ ssp }: { ssp: StudentSupportPlanWithAttachments }) {
  const sections = [
    { key: "strengths", label: "Strengths", value: ssp.strengths },
    { key: "keyNeeds", label: "Key Needs", value: ssp.keyNeeds },
    { key: "communicationSupports", label: "Communication Supports", value: ssp.communicationSupports },
    { key: "regulationSupports", label: "Regulation Supports", value: ssp.regulationSupports },
    { key: "targets", label: "Targets", value: ssp.targets },
    { key: "strategies", label: "Strategies & Adjustments", value: ssp.strategies },
    { key: "notes", label: "Notes", value: ssp.notes },
  ];

  return (
    <Accordion type="multiple" defaultValue={sections.filter(s => s.value).map(s => s.key)} className="space-y-2">
      {sections.map((section) => (
        section.value && (
          <AccordionItem key={section.key} value={section.key} className="border rounded-md px-4">
            <AccordionTrigger className="text-sm font-medium">{section.label}</AccordionTrigger>
            <AccordionContent>
              <p className="text-sm whitespace-pre-wrap">{section.value}</p>
            </AccordionContent>
          </AccordionItem>
        )
      ))}
    </Accordion>
  );
}

function SspFormDialog({ open, onOpenChange, studentId, existingSsp }: { open: boolean; onOpenChange: (open: boolean) => void; studentId: string; existingSsp: StudentSupportPlanWithAttachments | null }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [formData, setFormData] = useState({
    strengths: existingSsp?.strengths || "",
    keyNeeds: existingSsp?.keyNeeds || "",
    communicationSupports: existingSsp?.communicationSupports || "",
    regulationSupports: existingSsp?.regulationSupports || "",
    targets: existingSsp?.targets || "",
    strategies: existingSsp?.strategies || "",
    notes: existingSsp?.notes || "",
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (existingSsp) {
        return apiRequest("PATCH", `/api/ssp/${existingSsp.id}`, data);
      } else {
        return apiRequest("POST", "/api/ssp", { ...data, studentId });
      }
    },
    onSuccess: () => {
      toast({ title: existingSsp ? "Support plan updated" : "Support plan created" });
      qc.invalidateQueries({ queryKey: ["/api/students", studentId, "ssp"] });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Failed to save support plan", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existingSsp ? "Edit Support Plan" : "Create Support Plan"}</DialogTitle>
          <DialogDescription>Document the student's needs, strengths, and support strategies.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="strengths">Strengths</Label>
            <Textarea id="strengths" value={formData.strengths} onChange={(e) => setFormData({ ...formData, strengths: e.target.value })} placeholder="What are this student's strengths?" className="min-h-[80px]" data-testid="input-strengths" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="keyNeeds">Key Needs</Label>
            <Textarea id="keyNeeds" value={formData.keyNeeds} onChange={(e) => setFormData({ ...formData, keyNeeds: e.target.value })} placeholder="What are the student's key needs?" className="min-h-[80px]" data-testid="input-key-needs" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="communicationSupports">Communication Supports</Label>
            <Textarea id="communicationSupports" value={formData.communicationSupports} onChange={(e) => setFormData({ ...formData, communicationSupports: e.target.value })} placeholder="What communication supports are needed?" className="min-h-[80px]" data-testid="input-communication" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="regulationSupports">Regulation Supports</Label>
            <Textarea id="regulationSupports" value={formData.regulationSupports} onChange={(e) => setFormData({ ...formData, regulationSupports: e.target.value })} placeholder="What regulation supports are needed?" className="min-h-[80px]" data-testid="input-regulation" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="targets">Targets</Label>
            <Textarea id="targets" value={formData.targets} onChange={(e) => setFormData({ ...formData, targets: e.target.value })} placeholder="What are the learning targets?" className="min-h-[80px]" data-testid="input-targets" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="strategies">Strategies & Adjustments</Label>
            <Textarea id="strategies" value={formData.strategies} onChange={(e) => setFormData({ ...formData, strategies: e.target.value })} placeholder="What teaching strategies and adjustments are used?" className="min-h-[80px]" data-testid="input-strategies" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Any additional notes" className="min-h-[60px]" data-testid="input-notes" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending} data-testid="button-save-ssp">
              {mutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SspHistoryDialog({ open, onOpenChange, ssps }: { open: boolean; onOpenChange: (open: boolean) => void; ssps: StudentSupportPlanWithAttachments[] }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Support Plan History</DialogTitle>
          <DialogDescription>View previous versions of the student's support plan.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {ssps.map((ssp) => (
            <Card key={ssp.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="secondary">Archived</Badge>
                  <span className="text-sm text-muted-foreground">{format(new Date(ssp.createdAt), "dd MMM yyyy")}</span>
                </div>
              </CardHeader>
              <CardContent>
                <SspDisplayCard ssp={ssp} />
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PlanFormDialog({ open, onOpenChange, studentId, existingPlan, outcomes, studentEvidence }: { open: boolean; onOpenChange: (open: boolean) => void; studentId: string; existingPlan: StudentPlanWithEvidence | null; outcomes: LearningOutcome[]; studentEvidence: EvidenceWithOutcomes[] }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const mondayOfWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
  
  const [formData, setFormData] = useState({
    weekStartDate: existingPlan?.weekStartDate || format(mondayOfWeek, "yyyy-MM-dd"),
    focusPlu: existingPlan?.focusPlu || "",
    planText: existingPlan?.planText || "",
    nextSteps: existingPlan?.nextSteps || "",
  });

  // Create focus options from both PLUs (Junior Cycle) and modules (Senior Cycle)
  const pluNumbers = Array.from(new Set(outcomes.map(o => o.pluNumber).filter((n): n is number => n !== null && n > 0))).sort((a, b) => a - b);
  // Get unique modules using pluOrModuleCode as stable identifier
  const moduleOptions = Array.from(
    new Map(
      outcomes
        .filter(o => !o.pluNumber || o.pluNumber === 0)
        .filter(o => o.pluOrModuleCode && o.pluOrModuleTitle)
        .map(o => [o.pluOrModuleCode!, { code: o.pluOrModuleCode!, title: o.pluOrModuleTitle! }])
    ).values()
  ).sort((a, b) => a.title.localeCompare(b.title));
  const focusOptions = [
    ...pluNumbers.map(n => ({ value: String(n), label: `PLU ${n}` })),
    ...moduleOptions.map(m => ({ value: m.code, label: m.title })),
  ];

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (existingPlan) {
        return apiRequest("PATCH", `/api/plans/${existingPlan.id}`, data);
      } else {
        return apiRequest("POST", "/api/plans", { ...data, studentId });
      }
    },
    onSuccess: () => {
      toast({ title: existingPlan ? "Plan updated" : "Plan created" });
      qc.invalidateQueries({ queryKey: ["/api/students", studentId, "plans"] });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Failed to save plan", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/plans/${existingPlan!.id}`);
    },
    onSuccess: () => {
      toast({ title: "Plan deleted" });
      qc.invalidateQueries({ queryKey: ["/api/students", studentId, "plans"] });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Failed to delete plan", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{existingPlan ? "Edit Weekly Plan" : "Create Weekly Plan"}</DialogTitle>
          <DialogDescription>Plan activities and goals for the week.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="weekStartDate">Week Starting</Label>
            <Input type="date" id="weekStartDate" value={formData.weekStartDate} onChange={(e) => setFormData({ ...formData, weekStartDate: e.target.value })} data-testid="input-week-start" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="focusPlu">Focus Area (optional)</Label>
            <Select value={formData.focusPlu || "none"} onValueChange={(v) => setFormData({ ...formData, focusPlu: v === "none" ? "" : v })}>
              <SelectTrigger data-testid="select-focus-plu">
                <SelectValue placeholder="Select focus area" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No specific focus</SelectItem>
                {focusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="planText">Plan</Label>
            <Textarea id="planText" value={formData.planText} onChange={(e) => setFormData({ ...formData, planText: e.target.value })} placeholder="What will you work on this week?" className="min-h-[100px]" data-testid="input-plan-text" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nextSteps">Next Steps</Label>
            <Textarea id="nextSteps" value={formData.nextSteps} onChange={(e) => setFormData({ ...formData, nextSteps: e.target.value })} placeholder="What are the next steps?" className="min-h-[60px]" data-testid="input-next-steps" />
          </div>
          <div className="flex justify-between gap-2">
            <div>
              {existingPlan && (
                <Button type="button" variant="destructive" size="sm" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending} data-testid="button-delete-plan">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-save-plan">
                {mutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SchemeCard({ scheme, studentId }: { scheme: SchemeOfWorkWithStudents; studentId: string }) {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const handleDownload = async () => {
    if (!scheme.storagePath) return;
    try {
      const res = await fetch(`/api/schemes/${scheme.id}/signed-url`);
      const data = await res.json();
      if (data.signedUrl) {
        window.open(data.signedUrl, "_blank");
      }
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium">{scheme.title}</h4>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {scheme.term && <Badge variant="outline">{scheme.term}</Badge>}
              {scheme.classGroup && <Badge variant="secondary">{scheme.classGroup}</Badge>}
            </div>
            {scheme.description && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{scheme.description}</p>
            )}
          </div>
          {scheme.storagePath && (
            <Button variant="outline" size="sm" onClick={handleDownload} data-testid={`button-download-scheme-${scheme.id}`}>
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SchemeAssignDialog({ open, onOpenChange, studentId }: { open: boolean; onOpenChange: (open: boolean) => void; studentId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [mode, setMode] = useState<"assign" | "create">("assign");
  const [selectedSchemeId, setSelectedSchemeId] = useState("");
  const [newScheme, setNewScheme] = useState({ title: "", term: "", classGroup: "", description: "" });

  const { data: allSchemes } = useQuery<SchemeOfWorkWithStudents[]>({
    queryKey: ["/api/schemes"],
    enabled: open,
  });

  const assignMutation = useMutation({
    mutationFn: async (schemeId: string) => {
      return apiRequest("POST", `/api/schemes/${schemeId}/students/${studentId}`);
    },
    onSuccess: () => {
      toast({ title: "Scheme assigned" });
      qc.invalidateQueries({ queryKey: ["/api/students", studentId, "schemes"] });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Failed to assign scheme", variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newScheme) => {
      const scheme = await apiRequest("POST", "/api/schemes", data);
      const schemeData = await scheme.json();
      await apiRequest("POST", `/api/schemes/${schemeData.id}/students/${studentId}`);
      return schemeData;
    },
    onSuccess: () => {
      toast({ title: "Scheme created and assigned" });
      qc.invalidateQueries({ queryKey: ["/api/students", studentId, "schemes"] });
      qc.invalidateQueries({ queryKey: ["/api/schemes"] });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Failed to create scheme", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "assign" && selectedSchemeId) {
      assignMutation.mutate(selectedSchemeId);
    } else if (mode === "create" && newScheme.title) {
      createMutation.mutate(newScheme);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign Scheme of Work</DialogTitle>
          <DialogDescription>Choose an existing scheme or create a new one.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <Button type="button" variant={mode === "assign" ? "default" : "outline"} size="sm" onClick={() => setMode("assign")}>Existing</Button>
            <Button type="button" variant={mode === "create" ? "default" : "outline"} size="sm" onClick={() => setMode("create")}>New</Button>
          </div>

          {mode === "assign" ? (
            <div className="space-y-2">
              <Label>Select Scheme</Label>
              <Select value={selectedSchemeId} onValueChange={setSelectedSchemeId}>
                <SelectTrigger data-testid="select-scheme">
                  <SelectValue placeholder="Choose a scheme" />
                </SelectTrigger>
                <SelectContent>
                  {allSchemes?.map((scheme) => (
                    <SelectItem key={scheme.id} value={scheme.id}>
                      {scheme.title} {scheme.term && `(${scheme.term})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="schemeTitle">Title</Label>
                <Input id="schemeTitle" value={newScheme.title} onChange={(e) => setNewScheme({ ...newScheme, title: e.target.value })} placeholder="Scheme title" data-testid="input-scheme-title" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="schemeTerm">Term</Label>
                  <Input id="schemeTerm" value={newScheme.term} onChange={(e) => setNewScheme({ ...newScheme, term: e.target.value })} placeholder="e.g. Autumn" data-testid="input-scheme-term" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schemeClass">Class Group</Label>
                  <Input id="schemeClass" value={newScheme.classGroup} onChange={(e) => setNewScheme({ ...newScheme, classGroup: e.target.value })} placeholder="e.g. 6th Class" data-testid="input-scheme-class" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="schemeDesc">Description</Label>
                <Textarea id="schemeDesc" value={newScheme.description} onChange={(e) => setNewScheme({ ...newScheme, description: e.target.value })} placeholder="Brief description" data-testid="input-scheme-desc" />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={assignMutation.isPending || createMutation.isPending} data-testid="button-confirm-scheme">
              {(assignMutation.isPending || createMutation.isPending) ? "Saving..." : mode === "assign" ? "Assign" : "Create & Assign"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
