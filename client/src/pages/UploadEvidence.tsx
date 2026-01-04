import { useState, useEffect } from "react";
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
  Eye,
  Mic,
  File,
  X,
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
  { value: "observation", label: "Observation", icon: Eye },
  { value: "audio", label: "Audio", icon: Mic },
  { value: "other", label: "Other", icon: File },
];

const contextSources = [
  { value: "morning_work", label: "Morning Work" },
  { value: "task_box", label: "Task Box" },
  { value: "community_trip", label: "Community Trip" },
  { value: "lesson", label: "Lesson" },
  { value: "other", label: "Other" },
];

const independenceLevels = [
  { value: "independent", label: "Independent" },
  { value: "partial", label: "Partial" },
  { value: "prompted", label: "Prompted" },
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
  contextSource: string;
  staffInitials: string;
  notes: string;
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
    contextSource: "lesson",
    staffInitials: "",
    notes: "",
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
        dateOfActivity: new Date(formData.dateOfActivity).toISOString(),
        evidenceType: formData.evidenceType,
        contextSource: formData.contextSource,
        staffInitials: formData.staffInitials || null,
        notes: formData.notes || null,
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFormData((prev) => ({
      ...prev,
      file,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    }));

    await uploadFile(file);
  };

  const toggleOutcome = (outcomeId: string) => {
    setFormData((prev) => ({
      ...prev,
      outcomeIds: prev.outcomeIds.includes(outcomeId)
        ? prev.outcomeIds.filter((id) => id !== outcomeId)
        : [...prev.outcomeIds, outcomeId],
    }));
  };

  const filteredOutcomes = outcomes?.filter(
    (outcome) =>
      outcomeSearch === "" ||
      outcome.code.toLowerCase().includes(outcomeSearch.toLowerCase()) ||
      outcome.description.toLowerCase().includes(outcomeSearch.toLowerCase()) ||
      outcome.strand.toLowerCase().includes(outcomeSearch.toLowerCase())
  );

  const selectedStudent = students?.find((s) => s.id === formData.studentId);
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
        return !!formData.dateOfActivity && !!formData.evidenceType;
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
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-md bg-accent flex items-center justify-center">
                          {formData.fileType?.startsWith("image/") ? (
                            <Camera className="h-6 w-6 text-accent-foreground" />
                          ) : formData.fileType?.startsWith("video/") ? (
                            <Video className="h-6 w-6 text-accent-foreground" />
                          ) : (
                            <File className="h-6 w-6 text-accent-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{formData.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {Math.round(formData.fileSize / 1024)} KB
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
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              file: null,
                              fileUrl: "",
                              fileName: "",
                              fileType: "",
                              fileSize: 0,
                            }))
                          }
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <label className="block">
                    <Card className="cursor-pointer hover-elevate transition-colors">
                      <CardContent className="p-8 text-center">
                        <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="font-medium mb-1">Tap to upload or take a photo</p>
                        <p className="text-sm text-muted-foreground">
                          Photo, video, or document up to 10MB
                        </p>
                      </CardContent>
                    </Card>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                      capture="environment"
                      onChange={handleFileSelect}
                      data-testid="input-file-upload"
                    />
                  </label>
                )}
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
                        {outcome.code}
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
                  <ScrollArea className="h-64 border rounded-md">
                    <div className="p-2 space-y-1">
                      {filteredOutcomes?.map((outcome) => (
                        <div
                          key={outcome.id}
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-md cursor-pointer transition-colors hover-elevate",
                            formData.outcomeIds.includes(outcome.id) && "bg-accent"
                          )}
                          onClick={() => toggleOutcome(outcome.id)}
                          data-testid={`checkbox-outcome-${outcome.code}`}
                        >
                          <Checkbox
                            checked={formData.outcomeIds.includes(outcome.id)}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="font-mono">
                                {outcome.code}
                              </Badge>
                              <span className="text-xs text-muted-foreground">{outcome.strand}</span>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {outcome.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}

            {currentStep === "details" && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold">Evidence Details</h2>

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
                  <Label>Evidence Type</Label>
                  <div className="grid grid-cols-3 gap-2">
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

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Context</Label>
                    <Select
                      value={formData.contextSource}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, contextSource: value }))
                      }
                    >
                      <SelectTrigger data-testid="select-context">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {contextSources.map((source) => (
                          <SelectItem key={source.value} value={source.value}>
                            {source.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="Add any observations or notes about this evidence..."
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="resize-none"
                    data-testid="textarea-evidence-notes"
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
                            {outcome.code}
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
                        <p className="text-sm text-muted-foreground">Type</p>
                        <p className="font-medium capitalize">
                          {formData.evidenceType.replace("_", " ")}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Context</p>
                        <p className="font-medium capitalize">
                          {formData.contextSource.replace("_", " ")}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Independence</p>
                        <p className="font-medium capitalize">{formData.independenceLevel}</p>
                      </div>
                    </div>

                    {formData.notes && (
                      <div>
                        <p className="text-sm text-muted-foreground">Notes</p>
                        <p className="text-sm">{formData.notes}</p>
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
