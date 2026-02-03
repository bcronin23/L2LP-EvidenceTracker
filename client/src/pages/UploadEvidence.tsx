import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useSearch, Link } from "wouter";
import { format } from "date-fns";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  User,
  FileText,
  Tag,
  X,
  Building,
  MapPin,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Link2,
  Plus,
  ExternalLink,
  Trash2,
  Upload,
  File,
  Loader2,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { MobileHeader } from "@/components/MobileHeader";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { MobileNav } from "@/components/MobileNav";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Student, LearningOutcome, StudentProgrammeOverride } from "@shared/schema";
import { cn } from "@/lib/utils";

const evidenceTypes = [
  { value: "photo", label: "Photo" },
  { value: "video", label: "Video" },
  { value: "work_sample", label: "Work Sample" },
  { value: "audio", label: "Audio" },
  { value: "observation", label: "Observation (no file)" },
  { value: "other", label: "Other" },
];

const settingOptions = [
  { value: "classroom", label: "Classroom", icon: Building },
  { value: "community", label: "Community", icon: MapPin },
];

const independenceLevels = [
  { value: "independent", label: "Independent" },
  { value: "prompted", label: "Prompted" },
  { value: "partial", label: "Partial" },
  { value: "refused", label: "Refused" },
];

type Step = "student" | "links" | "outcomes" | "details" | "review";

const steps: { key: Step; label: string; icon: typeof User }[] = [
  { key: "student", label: "Student", icon: User },
  { key: "links", label: "Links", icon: Link2 },
  { key: "outcomes", label: "Outcomes", icon: Tag },
  { key: "details", label: "Details", icon: FileText },
  { key: "review", label: "Review", icon: Check },
];

interface DriveLink {
  url: string;
  label: string;
}

interface UploadedFile {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  driveFileId: string;
  driveWebViewLink: string;
}

interface FormData {
  studentIds: string[];
  links: DriveLink[];
  uploadedFiles: UploadedFile[];
  outcomeIds: string[];
  dateOfActivity: string;
  evidenceType: string;
  setting: string;
  assessmentActivity: string;
  observations: string;
  nextSteps: string;
  staffInitials: string;
  independenceLevel: string;
}

export default function UploadEvidence() {
  const searchParams = useSearch();
  const urlParams = new URLSearchParams(searchParams);
  const preSelectedStudent = urlParams.get("student") || "";
  const preSelectedOutcome = urlParams.get("outcome") || "";

  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<Step>("student");
  const [outcomeSearch, setOutcomeSearch] = useState("");
  const [expandedPLUs, setExpandedPLUs] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState<FormData>({
    studentIds: preSelectedStudent ? [preSelectedStudent] : [],
    links: [],
    uploadedFiles: [],
    outcomeIds: preSelectedOutcome ? [preSelectedOutcome] : [],
    dateOfActivity: format(new Date(), "yyyy-MM-dd"),
    evidenceType: "photo",
    setting: "classroom",
    assessmentActivity: "",
    observations: "",
    nextSteps: "",
    staffInitials: "",
    independenceLevel: "independent",
  });

  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  interface DriveStatus {
    connected: boolean;
    configured: boolean;
    sharedDriveRootFolderId: string | null;
  }
  const { data: driveStatus } = useQuery<DriveStatus>({
    queryKey: ["/api/organisation/drive/status"],
  });

  const { data: students, isLoading: studentsLoading } = useQuery<Student[]>({
    queryKey: ["/api/students"],
  });

  const { data: outcomes, isLoading: outcomesLoading } = useQuery<LearningOutcome[]>({
    queryKey: ["/api/outcomes"],
  });

  const firstStudentId = formData.studentIds[0];
  const { data: programmeOverrides } = useQuery<StudentProgrammeOverride[]>({
    queryKey: ["/api/students", firstStudentId, "programme-overrides"],
    enabled: !!firstStudentId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      // Build links array from added Drive links
      const driveLinks = formData.links.map(link => ({
        url: link.url,
        label: link.label || null,
      }));

      // Build files array from uploaded Drive files
      const driveFiles = formData.uploadedFiles.map((f, index) => ({
        storagePath: null,
        fileName: f.fileName,
        mimeType: f.mimeType,
        fileSize: f.fileSize,
        driveFileId: f.driveFileId,
        driveWebViewLink: f.driveWebViewLink,
        sortOrder: index,
      }));

      // Create evidence for each selected student
      const results = [];
      for (const studentId of formData.studentIds) {
        const res = await apiRequest("POST", "/api/evidence", {
          studentId,
          dateOfActivity: formData.dateOfActivity,
          evidenceType: formData.evidenceType,
          setting: formData.setting,
          assessmentActivity: formData.assessmentActivity || null,
          observations: formData.observations || null,
          nextSteps: formData.nextSteps || null,
          staffInitials: formData.staffInitials || null,
          independenceLevel: formData.independenceLevel,
          outcomeIds: formData.outcomeIds,
          files: driveFiles.length > 0 ? driveFiles : undefined,
          links: driveLinks.length > 0 ? driveLinks : undefined,
        });
        results.push(await res.json());
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/evidence"] });
      formData.studentIds.forEach(id => {
        queryClient.invalidateQueries({ queryKey: ["/api/students", id] });
      });
      const studentCount = formData.studentIds.length;
      toast({ 
        title: studentCount > 1 
          ? `Evidence saved for ${studentCount} students!` 
          : "Evidence saved successfully!" 
      });
      navigate(studentCount === 1 ? `/students/${formData.studentIds[0]}` : "/students");
    },
    onError: () => {
      toast({ title: "Failed to save evidence", variant: "destructive" });
    },
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const studentId = formData.studentIds[0];
    if (!studentId) {
      toast({ title: "Please select a student first", variant: "destructive" });
      return;
    }

    if (!driveStatus?.configured) {
      toast({ title: "Google Drive is not configured", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const formDataObj = new FormData();
      for (let i = 0; i < files.length; i++) {
        formDataObj.append("files", files[i]);
      }

      const response = await fetch(`/api/drive/upload/${studentId}`, {
        method: "POST",
        body: formDataObj,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Upload failed");
      }

      const result = await response.json();
      
      if (result.uploadedFiles && result.uploadedFiles.length > 0) {
        setFormData((prev) => ({
          ...prev,
          uploadedFiles: [...prev.uploadedFiles, ...result.uploadedFiles],
        }));
        toast({ 
          title: `${result.uploadedFiles.length} file${result.uploadedFiles.length > 1 ? "s" : ""} uploaded to Drive` 
        });
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({ title: error.message || "Failed to upload files", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeUploadedFile = (fileId: string) => {
    setFormData((prev) => ({
      ...prev,
      uploadedFiles: prev.uploadedFiles.filter((f) => f.id !== fileId),
    }));
  };

  const isValidDriveUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.hostname.includes("google.com") || parsed.hostname.includes("drive.google");
    } catch {
      return false;
    }
  };

  const addLink = () => {
    if (!newLinkUrl.trim()) {
      toast({ title: "Please enter a URL", variant: "destructive" });
      return;
    }
    if (!isValidDriveUrl(newLinkUrl)) {
      toast({ title: "Please enter a valid Google Drive URL", variant: "destructive" });
      return;
    }
    setFormData((prev) => ({
      ...prev,
      links: [...prev.links, { url: newLinkUrl.trim(), label: newLinkLabel.trim() }],
    }));
    setNewLinkUrl("");
    setNewLinkLabel("");
  };

  const removeLink = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      links: prev.links.filter((_, i) => i !== index),
    }));
  };

  const clearAllLinks = () => {
    setFormData((prev) => ({
      ...prev,
      links: [],
    }));
  };

  const toggleOutcome = (outcomeId: string) => {
    setFormData((prev) => ({
      ...prev,
      outcomeIds: prev.outcomeIds.includes(outcomeId)
        ? prev.outcomeIds.filter((id) => id !== outcomeId)
        : [...prev.outcomeIds, outcomeId],
    }));
  };

  const togglePLU = (pluCode: string) => {
    setExpandedPLUs((prev) => {
      const next = new Set(prev);
      if (next.has(pluCode)) {
        next.delete(pluCode);
      } else {
        next.add(pluCode);
      }
      return next;
    });
  };

  const selectedStudents = students?.filter((s) => formData.studentIds.includes(s.id)) || [];
  
  // Group outcomes by PLU/Module and Element (supports new multi-programme schema)
  type PLUGroup = { pluName: string; pluCode: string; elements: Map<string, LearningOutcome[]> };
  const groupedOutcomes = useMemo((): Map<string, PLUGroup> => {
    if (!outcomes) return new Map<string, PLUGroup>();
    
    // Filter outcomes by first selected student's programme(s), including overrides
    const firstStudent = selectedStudents[0];
    const baseProgrammeId = firstStudent?.programmeId;
    
    // Build a map of areaCode -> effective programmeId (override takes precedence)
    const overridesByArea = new Map<string, string>();
    if (programmeOverrides) {
      for (const override of programmeOverrides) {
        overridesByArea.set(override.areaCode, override.programmeId);
      }
    }
    
    // Filter outcomes: include if outcome's programme matches effective programme for its area
    let filteredByProgramme = outcomes;
    if (baseProgrammeId) {
      filteredByProgramme = outcomes.filter(o => {
        const outcomeAreaCode = o.areaCode;
        if (!outcomeAreaCode) {
          // If no area code, fall back to base programme check
          return o.programmeId === baseProgrammeId;
        }
        // Get effective programme for this area (override or base)
        const effectiveProgrammeId = overridesByArea.get(outcomeAreaCode) ?? baseProgrammeId;
        return o.programmeId === effectiveProgrammeId;
      });
    }
    
    const groups = new Map<string, PLUGroup>();
    
    filteredByProgramme
      .filter((o) => {
        if (!outcomeSearch) return true;
        const search = outcomeSearch.toLowerCase();
        const pluName = o.pluOrModuleTitle || o.pluName || "";
        const elementName = o.elementName || "";
        return (
          o.outcomeCode.toLowerCase().includes(search) ||
          o.outcomeText.toLowerCase().includes(search) ||
          pluName.toLowerCase().includes(search) ||
          elementName.toLowerCase().includes(search)
        );
      })
      .forEach((outcome) => {
        const pluCode = outcome.pluOrModuleCode || String(outcome.pluNumber || 0);
        const pluName = outcome.pluOrModuleTitle || outcome.pluName || pluCode;
        const elementName = outcome.elementName || "General";
        
        if (!groups.has(pluCode)) {
          groups.set(pluCode, { pluName, pluCode, elements: new Map() });
        }
        const plu = groups.get(pluCode)!;
        if (!plu.elements.has(elementName)) {
          plu.elements.set(elementName, []);
        }
        plu.elements.get(elementName)!.push(outcome);
      });
    
    return groups;
  }, [outcomes, outcomeSearch, selectedStudents, programmeOverrides]);

  // Track the last student ID for which we auto-expanded PLUs
  const lastExpandedStudentRef = useRef<string | null>(null);
  
  // Auto-expand all PLUs only on initial load or when student changes
  useEffect(() => {
    const currentStudentId = formData.studentIds[0] || "no-student";
    if (groupedOutcomes.size > 0 && lastExpandedStudentRef.current !== currentStudentId) {
      setExpandedPLUs(new Set(Array.from(groupedOutcomes.keys())));
      lastExpandedStudentRef.current = currentStudentId;
    }
  }, [groupedOutcomes, formData.studentIds]);

  const selectedOutcomes = outcomes?.filter((o) => formData.outcomeIds.includes(o.id)) || [];

  const canProceed = () => {
    switch (currentStep) {
      case "student":
        if (formData.studentIds.length === 0) return false;
        // Block proceeding if multiple students have different programmes
        if (selectedStudents.length > 1) {
          const programmes = new Set(selectedStudents.map(s => s.programmeId).filter(Boolean));
          if (programmes.size > 1) return false;
        }
        return true;
      case "links":
        return true; // Links are optional
      case "outcomes":
        return formData.outcomeIds.length > 0;
      case "details":
        return !!formData.dateOfActivity && !!formData.evidenceType && !!formData.setting;
      case "review":
        return true;
      default:
        return false;
    }
  };

  const stepIndex = steps.findIndex((s) => s.key === currentStep);

  const goNext = () => {
    const nextStep = steps[stepIndex + 1]?.key;
    if (nextStep) setCurrentStep(nextStep);
  };

  const goPrev = () => {
    const prevStep = steps[stepIndex - 1]?.key;
    if (prevStep) setCurrentStep(prevStep);
  };

  const handleSubmit = () => {
    createMutation.mutate();
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DesktopSidebar />

      <div className="flex-1 flex flex-col pb-20 md:pb-0">
        <MobileHeader title="Upload Evidence" />

        <div className="hidden md:flex items-center gap-4 p-6 border-b">
          <Link href="/students">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold">Upload Evidence</h1>
        </div>

        <div className="border-b px-4 py-3 md:px-6">
          <div className="flex items-center justify-between gap-2 max-w-2xl mx-auto">
            {steps.map((step, index) => (
              <div key={step.key} className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                    index < stepIndex
                      ? "bg-primary text-primary-foreground"
                      : index === stepIndex
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {index < stepIndex ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                <span className="hidden sm:inline text-sm text-muted-foreground">{step.label}</span>
                {index < steps.length - 1 && (
                  <div className="w-8 h-0.5 bg-muted hidden sm:block" />
                )}
              </div>
            ))}
          </div>
        </div>

        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <div className="max-w-2xl mx-auto">
            {currentStep === "student" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold">Select Students</h2>
                  {formData.studentIds.length > 0 && (
                    <Badge variant="secondary">
                      {formData.studentIds.length} selected
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Select one or more students to attach this evidence to
                </p>
                {studentsLoading ? (
                  <LoadingSpinner />
                ) : (
                  <div className="grid gap-3">
                    {students?.map((student) => {
                      const isSelected = formData.studentIds.includes(student.id);
                      return (
                        <Card
                          key={student.id}
                          className={cn(
                            "cursor-pointer transition-colors hover-elevate",
                            isSelected && "ring-2 ring-primary"
                          )}
                          onClick={() => setFormData((prev) => ({
                            ...prev,
                            studentIds: isSelected
                              ? prev.studentIds.filter(id => id !== student.id)
                              : [...prev.studentIds, student.id]
                          }))}
                          data-testid={`card-select-student-${student.id}`}
                        >
                          <CardContent className="p-4 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                              <span className="font-medium text-accent-foreground">
                                {student.firstName[0]}{student.lastName[0]}
                              </span>
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{student.firstName} {student.lastName}</p>
                              {student.classGroup && (
                                <Badge variant="secondary" className="text-xs mt-1">
                                  {student.classGroup}
                                </Badge>
                              )}
                            </div>
                            {isSelected && (
                              <Check className="h-5 w-5 text-primary" />
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
                
                {selectedStudents.length > 1 && (() => {
                  const programmes = new Set(selectedStudents.map(s => s.programmeId).filter(Boolean));
                  if (programmes.size > 1) {
                    return (
                      <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950">
                        <CardContent className="p-3 flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-red-800 dark:text-red-200">
                              Cannot Continue - Different Programmes
                            </p>
                            <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                              Selected students are on different programmes. Please select only students on the same programme to ensure learning outcomes are correctly matched.
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }
                  return null;
                })()}
              </div>
            )}

            {currentStep === "links" && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Evidence Files (Optional)</h2>
                <p className="text-sm text-muted-foreground">
                  Upload photos, videos, or documents directly to Google Drive, or add links to existing Drive files.
                </p>

                {driveStatus?.configured ? (
                  <Card className="border-accent/20 bg-accent/5">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-5 w-5 text-accent-foreground" />
                        <span className="font-medium">Upload to Google Drive</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Files will be uploaded to the student's folder in your school's Shared Drive
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                        data-testid="input-file-upload"
                      />
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading || formData.studentIds.length === 0}
                        data-testid="button-select-files"
                      >
                        {isUploading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        {isUploading ? "Uploading..." : "Select Files to Upload"}
                      </Button>
                      {formData.studentIds.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center">
                          Select a student first to enable uploads
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-muted bg-muted/30">
                    <CardContent className="p-4 flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Google Drive Not Configured</p>
                        <p className="text-xs text-muted-foreground">
                          Ask an admin to connect Google Drive in School Admin to enable direct uploads
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {formData.uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">
                        {formData.uploadedFiles.length} file{formData.uploadedFiles.length !== 1 ? "s" : ""} uploaded
                      </p>
                    </div>
                    <Card>
                      <CardContent className="p-2 space-y-1">
                        {formData.uploadedFiles.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center gap-3 p-2 rounded-md hover-elevate"
                          >
                            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <File className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{file.fileName}</p>
                              <p className="text-xs text-muted-foreground">
                                {(file.fileSize / 1024).toFixed(1)} KB
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(file.driveWebViewLink, "_blank")}
                              data-testid={`button-open-file-${file.id}`}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeUploadedFile(file.id)}
                              data-testid={`button-remove-file-${file.id}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                )}

                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium mb-2">Or add existing Drive links</h3>
                </div>

                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="link-url">Google Drive URL</Label>
                      <Input
                        id="link-url"
                        placeholder="https://drive.google.com/..."
                        value={newLinkUrl}
                        onChange={(e) => setNewLinkUrl(e.target.value)}
                        data-testid="input-drive-link-url"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="link-label">Label (optional)</Label>
                      <Input
                        id="link-label"
                        placeholder="e.g., Photo 1, Video recording"
                        value={newLinkLabel}
                        onChange={(e) => setNewLinkLabel(e.target.value)}
                        data-testid="input-drive-link-label"
                      />
                    </div>
                    <Button
                      onClick={addLink}
                      className="w-full"
                      variant="outline"
                      data-testid="button-add-link"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Link
                    </Button>
                  </CardContent>
                </Card>

                {formData.links.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">
                        {formData.links.length} link{formData.links.length !== 1 ? "s" : ""} added
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAllLinks}
                        data-testid="button-clear-all-links"
                      >
                        Clear all
                      </Button>
                    </div>
                    <Card>
                      <CardContent className="p-2 space-y-1">
                        {formData.links.map((link, index) => (
                          <div
                            key={`${link.url}-${index}`}
                            className="flex items-center gap-3 p-2 rounded-md hover-elevate"
                          >
                            <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center flex-shrink-0">
                              <Link2 className="h-4 w-4 text-accent-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {link.label || "Google Drive Link"}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {link.url}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(link.url, "_blank")}
                              data-testid={`button-open-link-${index}`}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeLink(index)}
                              data-testid={`button-remove-link-${index}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                )}

                <p className="text-xs text-muted-foreground text-center">
                  Tip: Copy the sharing link from Google Drive and paste it above
                </p>
              </div>
            )}

            {currentStep === "outcomes" && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Link Learning Outcomes</h2>
                <p className="text-sm text-muted-foreground">
                  Select one or more learning outcomes this evidence demonstrates.
                </p>

                {selectedOutcomes.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedOutcomes.map((outcome) => (
                      <Badge
                        key={outcome.id}
                        variant="default"
                        className="cursor-pointer"
                        onClick={() => toggleOutcome(outcome.id)}
                      >
                        {outcome.outcomeCode}
                        <X className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                )}

                <Input
                  type="search"
                  placeholder="Search outcomes..."
                  value={outcomeSearch}
                  onChange={(e) => setOutcomeSearch(e.target.value)}
                  data-testid="input-search-outcomes"
                />

                {outcomesLoading ? (
                  <LoadingSpinner />
                ) : (
                  <ScrollArea className="h-80 border rounded-md">
                    <div className="p-2">
                      {Array.from(groupedOutcomes.entries()).map(([pluCode, plu]) => (
                        <div key={pluCode} className="mb-4">
                          <button
                            type="button"
                            className="flex items-center gap-2 w-full text-left p-2 hover-elevate rounded-md"
                            onClick={() => togglePLU(pluCode)}
                          >
                            {expandedPLUs.has(pluCode) ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            <Badge variant="outline" className="font-mono">{plu.pluCode}</Badge>
                            <span className="font-medium text-sm">{plu.pluName}</span>
                          </button>
                          
                          {expandedPLUs.has(pluCode) && (
                            <div className="ml-6 space-y-2 mt-2">
                              {Array.from(plu.elements.entries()).map(([elementName, elementOutcomes]) => (
                                <div key={elementName}>
                                  <p className="text-xs font-medium text-muted-foreground mb-1 px-2">
                                    {elementName}
                                  </p>
                                  {elementOutcomes.map((outcome) => (
                                    <div
                                      key={outcome.id}
                                      className={cn(
                                        "flex items-start gap-3 p-2 rounded-md cursor-pointer transition-colors hover-elevate",
                                        formData.outcomeIds.includes(outcome.id) && "bg-accent"
                                      )}
                                      onClick={() => toggleOutcome(outcome.id)}
                                      data-testid={`checkbox-outcome-${outcome.outcomeCode}`}
                                    >
                                      <Checkbox
                                        checked={formData.outcomeIds.includes(outcome.id)}
                                        className="mt-0.5"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                          <Badge variant="outline" className="font-mono text-xs">
                                            {outcome.outcomeCode}
                                          </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                          {outcome.outcomeText}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}

            {currentStep === "details" && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold">Observation Sheet Details</h2>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Date of Activity</Label>
                    <Input
                      type="date"
                      value={formData.dateOfActivity}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, dateOfActivity: e.target.value }))
                      }
                      data-testid="input-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Staff Initials</Label>
                    <Input
                      placeholder="e.g., JD"
                      value={formData.staffInitials}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, staffInitials: e.target.value }))
                      }
                      maxLength={10}
                      data-testid="input-staff-initials"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Setting (Where was the student working?)</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {settingOptions.map((option) => (
                      <Card
                        key={option.value}
                        className={cn(
                          "cursor-pointer transition-colors hover-elevate",
                          formData.setting === option.value && "ring-2 ring-primary"
                        )}
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, setting: option.value }))
                        }
                        data-testid={`card-setting-${option.value}`}
                      >
                        <CardContent className="p-4 flex items-center gap-3">
                          <option.icon className="h-5 w-5 text-muted-foreground" />
                          <span className="font-medium">{option.label}</span>
                          {formData.setting === option.value && (
                            <Check className="h-4 w-4 text-primary ml-auto" />
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Evidence Type</Label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {evidenceTypes.map((type) => (
                      <Card
                        key={type.value}
                        className={cn(
                          "cursor-pointer transition-colors hover-elevate",
                          formData.evidenceType === type.value && "ring-2 ring-primary"
                        )}
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, evidenceType: type.value }))
                        }
                        data-testid={`card-type-${type.value}`}
                      >
                        <CardContent className="p-3 text-center">
                          <p className="text-xs">{type.label}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Independence Level</Label>
                  <Select
                    value={formData.independenceLevel}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, independenceLevel: value }))
                    }
                  >
                    <SelectTrigger data-testid="select-independence">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {independenceLevels.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Assessment Activity</Label>
                  <Input
                    placeholder="What activity was the student doing?"
                    value={formData.assessmentActivity}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, assessmentActivity: e.target.value }))
                    }
                    data-testid="input-assessment-activity"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Observations</Label>
                  <Textarea
                    placeholder="There is evidence of... (describe what you observed)"
                    value={formData.observations}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, observations: e.target.value }))
                    }
                    rows={3}
                    className="resize-none"
                    data-testid="textarea-observations"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Next Steps / Feedback</Label>
                  <Textarea
                    placeholder="What are the next steps for this student?"
                    value={formData.nextSteps}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, nextSteps: e.target.value }))
                    }
                    rows={3}
                    className="resize-none"
                    data-testid="textarea-next-steps"
                  />
                </div>
              </div>
            )}

            {currentStep === "review" && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold">Review & Submit</h2>

                <Card>
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                        <User className="h-5 w-5 text-accent-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">
                          {selectedStudents.length > 1 ? `Students (${selectedStudents.length})` : "Student"}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {selectedStudents.map((s) => (
                            <Badge key={s.id} variant="secondary">
                              {s.firstName} {s.lastName}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    {formData.uploadedFiles.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Uploaded Files ({formData.uploadedFiles.length})
                        </p>
                        <div className="space-y-1">
                          {formData.uploadedFiles.map((file) => (
                            <div key={file.id} className="flex items-center gap-2">
                              <File className="h-4 w-4 text-primary flex-shrink-0" />
                              <span className="text-sm truncate">{file.fileName}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2"
                                onClick={() => window.open(file.driveWebViewLink, "_blank")}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {formData.links.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Drive Links ({formData.links.length})
                        </p>
                        <div className="space-y-1">
                          {formData.links.map((link, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <Link2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm truncate">{link.label || "Google Drive Link"}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2"
                                onClick={() => window.open(link.url, "_blank")}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Learning Outcomes</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedOutcomes.map((outcome) => (
                          <Badge key={outcome.id} variant="secondary">
                            {outcome.outcomeCode}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Date</p>
                        <p className="font-medium">
                          {format(new Date(formData.dateOfActivity), "dd MMM yyyy")}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Setting</p>
                        <p className="font-medium capitalize">{formData.setting}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Type</p>
                        <p className="font-medium capitalize">
                          {formData.evidenceType.replace("_", " ")}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Independence</p>
                        <p className="font-medium capitalize">{formData.independenceLevel}</p>
                      </div>
                    </div>

                    {formData.assessmentActivity && (
                      <div>
                        <p className="text-sm text-muted-foreground">Assessment Activity</p>
                        <p className="text-sm">{formData.assessmentActivity}</p>
                      </div>
                    )}

                    {formData.observations && (
                      <div>
                        <p className="text-sm text-muted-foreground">Observations</p>
                        <p className="text-sm">{formData.observations}</p>
                      </div>
                    )}

                    {formData.nextSteps && (
                      <div>
                        <p className="text-sm text-muted-foreground">Next Steps</p>
                        <p className="text-sm">{formData.nextSteps}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </main>

        <div className="sticky bottom-20 md:bottom-0 left-0 right-0 border-t bg-background px-4 py-3 md:px-6">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
            <Button
              variant="outline"
              onClick={goPrev}
              disabled={stepIndex === 0}
              data-testid="button-prev-step"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            {currentStep === "review" ? (
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                data-testid="button-submit-evidence"
              >
                {createMutation.isPending ? "Saving..." : "Save Evidence"}
              </Button>
            ) : (
              <Button onClick={goNext} disabled={!canProceed()} data-testid="button-next-step">
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>

        <MobileNav />
      </div>
    </div>
  );
}
