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
  AlertTriangle,
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
import { GoogleDrivePicker } from "@/components/GoogleDrivePicker";
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

interface UploadedFile {
  file: File;
  storagePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  previewUrl?: string;
  isUploading: boolean;
  uploadProgress: number;
}

interface FormData {
  studentIds: string[];
  files: UploadedFile[];
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
    files: [],
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const { uploadFile } = useUpload({
    onSuccess: () => {},
    onError: () => {},
  });

  const { data: students, isLoading: studentsLoading } = useQuery<Student[]>({
    queryKey: ["/api/students"],
  });

  const { data: outcomes, isLoading: outcomesLoading } = useQuery<LearningOutcome[]>({
    queryKey: ["/api/outcomes"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      // Build files array from uploaded files
      const uploadedFiles = formData.files
        .filter(f => f.storagePath && !f.isUploading)
        .map(f => ({
          storagePath: f.storagePath,
          fileName: f.fileName,
          mimeType: f.mimeType,
          fileSize: f.fileSize,
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
          files: uploadedFiles.length > 0 ? uploadedFiles : undefined,
        });
        results.push(await res.json());
      }
      return results;
    },
    onSuccess: () => {
      // Clean up preview URLs
      formData.files.forEach(f => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      });
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/evidence"] });
      formData.studentIds.forEach(id => {
        queryClient.invalidateQueries({ queryKey: ["/api/students", id] });
      });
      const studentCount = formData.studentIds.length;
      toast({ 
        title: studentCount > 1 
          ? `Evidence uploaded for ${studentCount} students!` 
          : "Evidence uploaded successfully!" 
      });
      navigate(studentCount === 1 ? `/students/${formData.studentIds[0]}` : "/students");
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
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const filesToAdd: UploadedFile[] = [];
    const errors: string[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File too large (max 50MB)`);
        continue;
      }

      if (ALLOWED_TYPES.length > 0 && !ALLOWED_TYPES.includes(file.type) && file.type !== "") {
        errors.push(`${file.name}: Unsupported file type`);
        continue;
      }

      const previewUrl = (file.type.startsWith("image/") || file.type.startsWith("video/"))
        ? URL.createObjectURL(file)
        : undefined;

      filesToAdd.push({
        file,
        storagePath: "",
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        previewUrl,
        isUploading: true,
        uploadProgress: 0,
      });
    }

    if (errors.length > 0) {
      toast({ 
        title: "Some files could not be added", 
        description: errors.slice(0, 3).join("; ") + (errors.length > 3 ? `... and ${errors.length - 3} more` : ""),
        variant: "destructive" 
      });
    }

    if (filesToAdd.length === 0) return;

    // Add files to state
    setFormData((prev) => ({
      ...prev,
      files: [...prev.files, ...filesToAdd],
    }));

    // Upload each file
    for (const uploadedFile of filesToAdd) {
      try {
        const response = await uploadFile(uploadedFile.file);
        if (response?.objectPath) {
          setFormData((prev) => ({
            ...prev,
            files: prev.files.map(f => 
              f.file === uploadedFile.file 
                ? { ...f, storagePath: response.objectPath, isUploading: false, uploadProgress: 100 }
                : f
            ),
          }));
        } else {
          throw new Error("Upload failed");
        }
      } catch {
        setFormData((prev) => ({
          ...prev,
          files: prev.files.filter(f => f.file !== uploadedFile.file),
        }));
        toast({ title: `Failed to upload ${uploadedFile.fileName}`, variant: "destructive" });
      }
    }

    // Reset the input so the same files can be selected again if needed
    e.target.value = "";
  };

  const removeFile = (fileToRemove: UploadedFile) => {
    if (fileToRemove.previewUrl) {
      URL.revokeObjectURL(fileToRemove.previewUrl);
    }
    setFormData((prev) => ({
      ...prev,
      files: prev.files.filter(f => f !== fileToRemove),
    }));
  };

  const clearAllFiles = () => {
    formData.files.forEach(f => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    });
    setFormData((prev) => ({
      ...prev,
      files: [],
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

  const selectedStudents = students?.filter((s) => formData.studentIds.includes(s.id)) || [];
  
  // Group outcomes by PLU/Module and Element (supports new multi-programme schema)
  type PLUGroup = { pluName: string; pluCode: string; elements: Map<string, LearningOutcome[]> };
  const groupedOutcomes = useMemo((): Map<string, PLUGroup> => {
    if (!outcomes) return new Map<string, PLUGroup>();
    
    // Filter outcomes by first selected student's programme if student has a programmeId
    const firstStudent = selectedStudents[0];
    const studentProgrammeId = firstStudent?.programmeId;
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
  }, [outcomes, outcomeSearch, selectedStudents]);

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

  // Check if all files are fully uploaded (not uploading AND have storagePath)
  const allFilesUploaded = formData.files.length === 0 || 
    formData.files.every(f => !f.isUploading && f.storagePath);

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
      case "file":
        return allFilesUploaded;
      case "outcomes":
        return formData.outcomeIds.length > 0;
      case "details":
        return !!formData.dateOfActivity && !!formData.evidenceType && !!formData.setting;
      case "review":
        return allFilesUploaded;
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

            {currentStep === "file" && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Upload Files (Optional)</h2>
                <p className="text-sm text-muted-foreground">
                  Upload photos, videos, or documents as evidence. You can select multiple files or skip this step for observations.
                </p>

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
                      ref={cameraInputRef}
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
                        <p className="font-medium text-sm">Choose Files</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Select multiple
                        </p>
                      </CardContent>
                    </Card>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                      multiple
                      onChange={handleFileSelect}
                      data-testid="input-file-upload"
                    />
                  </label>
                </div>

                <div className="flex justify-center">
                  <GoogleDrivePicker
                    onFilesSelected={(files) => {
                      const newFiles: UploadedFile[] = files.map((f) => ({
                        file: null as any,
                        storagePath: f.storagePath,
                        fileName: f.fileName,
                        mimeType: f.mimeType,
                        fileSize: f.fileSize,
                        isUploading: false,
                        uploadProgress: 100,
                      }));
                      setFormData(prev => ({
                        ...prev,
                        files: [...prev.files, ...newFiles],
                      }));
                      toast({ title: `Imported ${files.length} file(s) from Google Drive` });
                    }}
                  />
                </div>

                {formData.files.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">
                        {formData.files.length} file{formData.files.length !== 1 ? "s" : ""} selected
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAllFiles}
                        data-testid="button-clear-all-files"
                      >
                        Clear all
                      </Button>
                    </div>
                    <Card>
                      <CardContent className="p-2 space-y-1">
                        {formData.files.map((f, index) => (
                          <div
                            key={`${f.fileName}-${index}`}
                            className="flex items-center gap-3 p-2 rounded-md hover-elevate"
                          >
                            <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center flex-shrink-0">
                              {f.mimeType?.startsWith("image/") ? (
                                <Camera className="h-4 w-4 text-accent-foreground" />
                              ) : f.mimeType?.startsWith("video/") ? (
                                <Video className="h-4 w-4 text-accent-foreground" />
                              ) : f.mimeType?.startsWith("audio/") ? (
                                <Mic className="h-4 w-4 text-accent-foreground" />
                              ) : (
                                <FileText className="h-4 w-4 text-accent-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{f.fileName}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(f.fileSize)}
                              </p>
                            </div>
                            {f.isUploading ? (
                              <div className="w-16">
                                <Progress value={f.uploadProgress} className="h-2" />
                              </div>
                            ) : f.storagePath ? (
                              <Badge variant="secondary" className="text-xs">Uploaded</Badge>
                            ) : null}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFile(f)}
                              disabled={f.isUploading}
                              data-testid={`button-remove-file-${index}`}
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
                  Supported: images, videos, audio, PDF, Word, PowerPoint, Excel (max 50MB per file)
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

                    {formData.files.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Files ({formData.files.length})
                        </p>
                        <div className="space-y-1">
                          {formData.files.map((f, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm truncate">{f.fileName}</span>
                              <span className="text-xs text-muted-foreground">
                                ({formatFileSize(f.fileSize)})
                              </span>
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
