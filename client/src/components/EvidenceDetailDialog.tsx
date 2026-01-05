import { format } from "date-fns";
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

interface EvidenceDetailDialogProps {
  evidence: EvidenceWithOutcomes | null;
  onClose: () => void;
}

export function EvidenceDetailDialog({ evidence, onClose }: EvidenceDetailDialogProps) {
  if (!evidence) return null;

  const Icon = evidenceTypeIcons[evidence.evidenceType] || File;
  const isImage = evidence.fileType?.startsWith("image/");
  const isVideo = evidence.fileType?.startsWith("video/");

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
            {evidence.fileUrl && (
              <div className="rounded-md overflow-hidden bg-muted">
                {isImage ? (
                  <img
                    src={evidence.fileUrl}
                    alt={evidence.fileName || "Evidence"}
                    className="w-full h-auto max-h-64 object-contain"
                  />
                ) : isVideo ? (
                  <video
                    src={evidence.fileUrl}
                    controls
                    className="w-full h-auto max-h-64"
                  />
                ) : (
                  <div className="p-8 text-center">
                    <File className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">{evidence.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {evidence.fileSize ? `${Math.round(evidence.fileSize / 1024)} KB` : "File"}
                    </p>
                  </div>
                )}
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

        {evidence.fileUrl && (
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" asChild>
              <a href={evidence.fileUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={evidence.fileUrl} download={evidence.fileName || "evidence"}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </a>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
