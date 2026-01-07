import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useSearch, Link } from "wouter";
import { format } from "date-fns";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Upload,
  User,
  FileText,
  Tag,
  Camera,
  Video,
  Mic,
  File,
  X,
  Building,
  MapPin,
  ChevronDown,
  ChevronRight,
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
import { Progress } from "@/components/ui/progress";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { MobileHeader } from "@/components/MobileHeader";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { MobileNav } from "@/components/MobileNav";
import { useUpload } from "@/hooks/use-upload";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Student, LearningOutcome } from "@shared/schema";
import { cn } from "@/lib/utils";

const evidenceTypes = [
  { value: "photo", label: "Photo", icon: Camera },
  { value: "video", label: "Video", icon: Video },
  { value: "work_sample", label: "Work Sample", icon: FileText },
  { value: "audio", label: "Audio", icon: Mic },
  { value: "other", label: "Other", icon: File },
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

type Step = "student" | "file" | "outcomes" | "details" | "review";

const steps: { key: Step; label: string; icon: typeof User }[] = [
  { key: "student", label: "Student", icon: User },
  { key: "file", label: "File", icon: Upload },
  { key: "outcomes", label: "Outcomes", icon: Tag },
  { key: "details", label: "Details", icon: FileText },
  { key: "review", label: "Review", icon: Check },
];

interface FormData {
  studentId: string;
  file: File | null;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  outcomeIds: string[];
  dateOfActivity: string;
  evidenceType: string;
  setting: string;
  assessmentActivity: string;
  successCriteria: string;
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
    studentId: preSelectedStudent,
    file: null,
    fileUrl: "",
    fileName: "",
    fileType: "",
    fileSize: 0,
    outcomeIds: preSelectedOutcome ? [preSelectedOutcome] : [],
    dateOfActivity: format(new Date(), "yyyy-MM-dd"),
    evidenceType: "photo",
    setting: "classroom",
    assessmentActivity: "",
    successCriteria: "",
    observations: "",
    nextSteps: "",
    staffInitials: "",
    independenceLevel: "independent",
  });

  const { uploadFile, isUploading, progress } = useUpload({
    onSuccess: (response) => {
      setFormData((prev) => ({
        ...prev,
        fileUrl: response.objectPath,
      }));
    },
    onError: () => {
      toast({ title: "Failed to upload file", variant: "destructive" });
    },
  });

  const { data: students, isLoading: studentsLoading } = useQuery<Student[]>({
    queryKey: ["/api/students"],
  });

  const { data: outcomes, isLoading: outcomesLoading } = useQuery<LearningOutcome[]>({
    queryKey: ["/api/outcomes"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/evidence", {
        studentId: formData.studentId,
        dateOfActivity: formData.dateOfActivity,
        evidenceType: formData.evidenceType,
        setting: formData.setting,
        assessmentActivity: formData.assessmentActivity || null,
        successCriteria: formData.successCriteria || null,
        observations: formData.observations || null,
        nextSteps: formData.nextSteps || null,
        staffInitials: formData.staffInitials || null,
        independenceLevel: formData.independenceLevel,
        fileUrl: formData.fileUrl || null,
        fileName: formData.fileName || null,
        fileType: formData.fileType || null,
        fileSize: formData.fileSize || null,
        outcomeIds: formData.outcomeIds,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/evidence"] });
      queryClient.invalidateQueries({ queryKey: ["/api/students", formData.studentId] });
      toast({ title: "Evidence uploaded successfully!" });
      navigate(`/students/${formData.studentId}`);
    },
    onError: () => {
      toast({ title: "Failed to save evidence", variant: "destructive" });
    },
  });

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  const ALLOWED_TYPES = [
    "image/jpeg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif",
    "video/mp4", "video/quicktime", "video/webm", "video/x-msvideo",
    "audio/mpeg", "audio/wav", "audio/ogg", "audio/webm",
    "application/pdf",
    "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast({ title: "File too large", description: "Maximum file size is 50MB", variant: "destructive" });
      return;
    }

    if (ALLOWED_TYPES.length > 0 && !ALLOWED_TYPES.includes(file.type) && file.type !== "") {
      toast({ title: "Unsupported file type", description: "Please upload an image, video, audio, or document file", variant: "destructive" });
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }

    setFormData((prev) => ({
      ...prev,
      file,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    }));

    await uploadFile(file);
  };

  const clearFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setFormData((prev) => ({
      ...prev,
      file: null,
      fileUrl: "",
      fileName: "",
      fileType: "",
      fileSize: 0,
    }));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

  const selectedStudent = students?.find((s) => s.id === formData.studentId);
  
  // Group outcomes by PLU/Module and Element (supports new multi-programme schema)
  type PLUGroup = { pluName: string; pluCode: string; elements: Map<string, LearningOutcome[]> };
  const groupedOutcomes = useMemo((): Map<string, PLUGroup> => {
    if (!outcomes) return new Map<string, PLUGroup>();
    
    // Filter outcomes by selected student's programme if student has a programmeId
    const studentProgrammeId = selectedStudent?.programmeId;
    let filteredByProgramme = outcomes;
    if (studentProgrammeId) {
      filteredByProgramme = outcomes.filter(o => o.programmeId === studentProgrammeId);
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
  }, [outcomes, outcomeSearch, selectedStudent?.programmeId]);

  // Track the last student ID for which we auto-expanded PLUs
  const lastExpandedStudentRef = useRef<string | null>(null);
  
  // Auto-expand all PLUs only on initial load or when student changes
  useEffect(() => {
    const currentStudentId = formData.studentId || "no-student";
    if (groupedOutcomes.size > 0 && lastExpandedStudentRef.current !== currentStudentId) {
      setExpandedPLUs(new Set(Array.from(groupedOutcomes.keys())));
      lastExpandedStudentRef.current = currentStudentId;
    }
  }, [groupedOutcomes, formData.studentId]);

  const selectedOutcomes = outcomes?.filter((o) => formData.outcomeIds.includes(o.id)) || [];

  const canProceed = () => {
    switch (currentStep) {
      case "student":
        return !!formData.studentId;
      case "file":
        return !isUploading;
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
                <h2 className="text-lg font-semibold">Select Student</h2>
                {studentsLoading ? (
                  <LoadingSpinner />
                ) : (
                  <div className="grid gap-3">
                    {students?.map((student) => (
                      <Card
                        key={student.id}
                        className={cn(
                          "cursor-pointer transition-colors hover-elevate",
                          formData.studentId === student.id && "ring-2 ring-primary"
                        )}
                        onClick={() => setFormData((prev) => ({ ...prev, studentId: student.id }))}
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
                          {formData.studentId === student.id && (
                            <Check className="h-5 w-5 text-primary" />
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {currentStep === "file" && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Upload File (Optional)</h2>
                <p className="text-sm text-muted-foreground">
                  Upload a photo, video, or document as evidence. You can skip this step for observations.
                </p>

                {formData.file ? (
                  <Card>
                    <CardContent className="p-4">
                      {previewUrl && formData.fileType?.startsWith("image/") && (
                        <div className="mb-4">
                          <img
                            src={previewUrl}
                            alt="Preview"
                            className="w-full max-h-48 object-contain rounded-md bg-muted"
                          />
                        </div>
                      )}
                      {previewUrl && formData.fileType?.startsWith("video/") && (
                        <div className="mb-4">
                          <video
                            src={previewUrl}
                            className="w-full max-h-48 rounded-md bg-muted"
                            controls
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-md bg-accent flex items-center justify-center flex-shrink-0">
                          {formData.fileType?.startsWith("image/") ? (
                            <Camera className="h-6 w-6 text-accent-foreground" />
                          ) : formData.fileType?.startsWith("video/") ? (
                            <Video className="h-6 w-6 text-accent-foreground" />
                          ) : formData.fileType?.startsWith("audio/") ? (
                            <Mic className="h-6 w-6 text-accent-foreground" />
                          ) : (
                            <FileText className="h-6 w-6 text-accent-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{formData.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(formData.fileSize)}
                          </p>
                        </div>
                        {isUploading ? (
                          <div className="w-24">
                            <Progress value={progress} className="h-2" />
                          </div>
                        ) : formData.fileUrl ? (
                          <Badge variant="secondary">Uploaded</Badge>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={clearFile}
                          data-testid="button-clear-file"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <Card className="cursor-pointer hover-elevate transition-colors h-full">
                        <CardContent className="p-6 text-center flex flex-col items-center justify-center h-full">
                          <Camera className="h-10 w-10 text-muted-foreground mb-3" />
                          <p className="font-medium text-sm">Take Photo</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Use camera
                          </p>
                        </CardContent>
                      </Card>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileSelect}
                        data-testid="input-camera-capture"
                      />
                    </label>
                    <label className="block">
                      <Card className="cursor-pointer hover-elevate transition-colors h-full">
                        <CardContent className="p-6 text-center flex flex-col items-center justify-center h-full">
                          <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                          <p className="font-medium text-sm">Choose File</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Photo, video, doc
                          </p>
                        </CardContent>
                      </Card>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                        onChange={handleFileSelect}
                        data-testid="input-file-upload"
                      />
                    </label>
                  </div>
                )}

                <p className="text-xs text-muted-foreground text-center">
                  Supported: images, videos, audio, PDF, Word, PowerPoint, Excel (max 50MB)
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
                          <type.icon className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
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
                  <Label>Success Criteria</Label>
                  <Textarea
                    placeholder="What were the success criteria for this activity? (one per line)"
                    value={formData.successCriteria}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, successCriteria: e.target.value }))
                    }
                    rows={3}
                    className="resize-none"
                    data-testid="textarea-success-criteria"
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
                      <div>
                        <p className="text-sm text-muted-foreground">Student</p>
                        <p className="font-medium">
                          {selectedStudent?.firstName} {selectedStudent?.lastName}
                        </p>
                      </div>
                    </div>

                    {formData.fileName && (
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-md bg-accent flex items-center justify-center">
                          <File className="h-5 w-5 text-accent-foreground" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">File</p>
                          <p className="font-medium truncate max-w-xs">{formData.fileName}</p>
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
