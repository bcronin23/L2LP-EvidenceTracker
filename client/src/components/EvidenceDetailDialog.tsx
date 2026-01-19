import { useState } from "react";
import { format } from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Download, Camera, Video, FileText, Mic, File, ExternalLink, Building, MapPin, Trash2, Loader2, Pencil } from "lucide-react";
import { useOrganisation } from "@/hooks/use-organisation";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { EditOutcomesDialog } from "./EditOutcomesDialog";
import type { EvidenceWithOutcomes, Student } from "@shared/schema";

const evidenceTypeIcons: Record<string, typeof Camera> = {
  photo: Camera,
  video: Video,
  work_sample: FileText,
  audio: Mic,
  other: File,
};

interface SignedUrlFile {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  signedUrl: string;
}

interface SignedUrlResponse {
  files: SignedUrlFile[];
  expiresIn: number;
}

interface EvidenceDetailDialogProps {
  evidence: EvidenceWithOutcomes | null;
  student?: Student | null;
  onClose: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string | null | undefined) {
  if (!mimeType) return File;
  if (mimeType.startsWith("image/")) return Camera;
  if (mimeType.startsWith("video/")) return Video;
  if (mimeType.startsWith("audio/")) return Mic;
  return FileText;
}

export function EvidenceDetailDialog({ evidence, student, onClose }: EvidenceDetailDialogProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditOutcomes, setShowEditOutcomes] = useState(false);
  const { isAdmin } = useOrganisation();
  const { toast } = useToast();

  const { data: response } = useQuery<SignedUrlResponse>({
    queryKey: [`/api/evidence/${evidence?.id}/files-signed-urls`],
    enabled: !!evidence?.id && (evidence?.files?.length ?? 0) > 0,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/evidence/${evidence?.id}`);
    },
    onSuccess: () => {
      toast({ title: "Evidence deleted", description: "The evidence has been removed." });
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/evidence"] });
      onClose();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete evidence.", variant: "destructive" });
    },
  });

  if (!evidence) return null;

  const Icon = evidenceTypeIcons[evidence.evidenceType] || File;
  const files = response?.files || [];
  const hasFiles = files.length > 0;

  return (
    <Dialog open={!!evidence} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            <span className="capitalize">{evidence.evidenceType.replace("_", " ")}</span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {hasFiles && (
              <div className="space-y-3">
                {files.map((file, index) => {
                  const isImage = file.mimeType?.startsWith("image/");
                  const isVideo = file.mimeType?.startsWith("video/");
                  const FileIcon = getFileIcon(file.mimeType);

                  return (
                    <div key={file.id || index} className="rounded-md overflow-hidden bg-muted">
                      {isImage ? (
                        <img
                          src={file.signedUrl}
                          alt={file.fileName || "Evidence"}
                          className="w-full h-auto max-h-64 object-contain"
                        />
                      ) : isVideo ? (
                        <video
                          src={file.signedUrl}
                          controls
                          className="w-full h-auto max-h-64"
                        />
                      ) : (
                        <div className="p-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-md bg-accent flex items-center justify-center flex-shrink-0">
                            <FileIcon className="h-5 w-5 text-accent-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{file.fileName}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.fileSize)}
                            </p>
                          </div>
                          <Button variant="ghost" size="icon" asChild>
                            <a href={file.signedUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      )}
                      {(isImage || isVideo) && (
                        <div className="p-2 flex items-center justify-between gap-2 border-t bg-background/50">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-xs text-muted-foreground truncate">{file.fileName}</span>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                              <a href={file.signedUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                              <a href={file.signedUrl} download={file.fileName}>
                                <Download className="h-3 w-3" />
                              </a>
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-xs text-muted-foreground">Date of Activity</p>
                  <p className="text-sm font-medium">
                    {format(new Date(evidence.dateOfActivity), "dd MMMM yyyy")}
                  </p>
                </div>
                {evidence.staffInitials && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Staff</p>
                    <p className="text-sm font-medium">{evidence.staffInitials}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
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
                <Badge
                  variant={
                    evidence.independenceLevel === "independent"
                      ? "default"
                      : evidence.independenceLevel === "refused"
                      ? "destructive"
                      : "secondary"
                  }
                  className="capitalize"
                >
                  {evidence.independenceLevel}
                </Badge>
              </div>
            </div>

            {evidence.assessmentActivity && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Assessment Activity</p>
                  <p className="text-sm">{evidence.assessmentActivity}</p>
                </div>
              </>
            )}

            {evidence.successCriteria && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Success Criteria</p>
                  <p className="text-sm whitespace-pre-line">{evidence.successCriteria}</p>
                </div>
              </>
            )}

            {evidence.observations && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Observations</p>
                  <p className="text-sm">{evidence.observations}</p>
                </div>
              </>
            )}

            {evidence.nextSteps && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Next Steps / Feedback</p>
                  <p className="text-sm">{evidence.nextSteps}</p>
                </div>
              </>
            )}

            <Separator />
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs text-muted-foreground">Learning Outcomes</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEditOutcomes(true)}
                  data-testid="button-edit-outcomes"
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              </div>
              {evidence.outcomes && evidence.outcomes.length > 0 ? (
                <div className="space-y-2">
                  {evidence.outcomes.map((outcome) => (
                    <div key={outcome.id} className="flex items-start gap-2">
                      <Badge variant="outline" className="flex-shrink-0 font-mono">
                        {outcome.outcomeCode}
                      </Badge>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{outcome.pluName}</p>
                        <p className="text-xs text-muted-foreground">{outcome.elementName}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {outcome.outcomeText}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground py-2">
                  No learning outcomes linked. Click Edit to add outcomes.
                </div>
              )}
            </div>

            {isAdmin && (
              <>
                <Separator />
                <div className="pt-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={() => setShowDeleteConfirm(true)}
                    data-testid="button-delete-evidence"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Evidence
                  </Button>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Evidence?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the evidence from the student's record. This action cannot be easily undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showEditOutcomes && evidence && (
        <EditOutcomesDialog
          evidence={evidence}
          student={student || null}
          open={showEditOutcomes}
          onOpenChange={setShowEditOutcomes}
        />
      )}
    </Dialog>
  );
}
