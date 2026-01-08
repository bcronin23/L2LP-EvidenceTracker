import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Download, Camera, Video, FileText, Mic, File, ExternalLink, Building, MapPin } from "lucide-react";
import type { EvidenceWithOutcomes } from "@shared/schema";

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

interface EvidenceDetailDialogProps {
  evidence: EvidenceWithOutcomes | null;
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

export function EvidenceDetailDialog({ evidence, onClose }: EvidenceDetailDialogProps) {
  const { data: signedUrlsData } = useQuery<SignedUrlFile[]>({
    queryKey: ["/api/evidence", evidence?.id, "files-signed-urls"],
    enabled: !!evidence?.id && (evidence?.files?.length ?? 0) > 0,
  });

  if (!evidence) return null;

  const Icon = evidenceTypeIcons[evidence.evidenceType] || File;
  const files = signedUrlsData || [];
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

            {evidence.outcomes && evidence.outcomes.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Learning Outcomes</p>
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
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
