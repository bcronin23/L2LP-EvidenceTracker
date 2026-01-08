import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, FileText, Image, Video, Music, File, Search, Check } from "lucide-react";
import { SiGoogledrive } from "react-icons/si";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  thumbnailLink?: string;
  modifiedTime?: string;
}

interface GoogleDrivePickerProps {
  onFilesSelected: (files: Array<{
    storagePath: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
  }>) => void;
  disabled?: boolean;
}

export function GoogleDrivePicker({ onFilesSelected, disabled }: GoogleDrivePickerProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<DriveFile[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const { data: statusData } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/google-drive/status"],
    enabled: open,
  });

  const { data: filesData, isLoading: isLoadingFiles } = useQuery<{ files: DriveFile[]; nextPageToken?: string }>({
    queryKey: ["/api/google-drive/files", searchQuery],
    enabled: open && statusData?.connected,
  });

  const toggleFileSelection = (file: DriveFile) => {
    setSelectedFiles(prev => {
      const isSelected = prev.some(f => f.id === file.id);
      if (isSelected) {
        return prev.filter(f => f.id !== file.id);
      }
      return [...prev, file];
    });
  };

  const handleImport = async () => {
    if (selectedFiles.length === 0) return;
    
    setIsImporting(true);
    try {
      const importedFiles = await Promise.all(
        selectedFiles.map(async (file) => {
          const res = await fetch(`/api/google-drive/files/${file.id}/download`, {
            credentials: "include",
          });
          if (!res.ok) throw new Error("Failed to import file");
          return res.json();
        })
      );
      
      onFilesSelected(importedFiles.map(f => ({
        storagePath: f.storagePath,
        fileName: f.fileName,
        mimeType: f.mimeType,
        fileSize: f.fileSize,
      })));
      
      setOpen(false);
      setSelectedFiles([]);
    } catch (error) {
      console.error("Import error:", error);
    } finally {
      setIsImporting(false);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/") || mimeType.includes("photo")) {
      return <Image className="h-5 w-5 text-muted-foreground" />;
    }
    if (mimeType.startsWith("video/")) {
      return <Video className="h-5 w-5 text-muted-foreground" />;
    }
    if (mimeType.startsWith("audio/")) {
      return <Music className="h-5 w-5 text-muted-foreground" />;
    }
    if (mimeType.includes("document") || mimeType.includes("word")) {
      return <FileText className="h-5 w-5 text-blue-500" />;
    }
    if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) {
      return <FileText className="h-5 w-5 text-green-500" />;
    }
    if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) {
      return <FileText className="h-5 w-5 text-orange-500" />;
    }
    if (mimeType.includes("pdf")) {
      return <FileText className="h-5 w-5 text-red-500" />;
    }
    return <File className="h-5 w-5 text-muted-foreground" />;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className="gap-2"
          data-testid="button-google-drive"
        >
          <SiGoogledrive className="h-4 w-4" />
          Google Drive
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SiGoogledrive className="h-5 w-5" />
            Import from Google Drive
          </DialogTitle>
        </DialogHeader>

        {!statusData?.connected ? (
          <div className="py-8 text-center text-muted-foreground">
            <SiGoogledrive className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Google Drive is not connected.</p>
            <p className="text-sm mt-2">Please connect your Google Drive in settings.</p>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-drive-search"
              />
            </div>

            <ScrollArea className="h-[400px] border rounded-md">
              {isLoadingFiles ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filesData?.files?.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No files found
                </div>
              ) : (
                <div className="divide-y">
                  {filesData?.files?.map((file) => {
                    const isSelected = selectedFiles.some(f => f.id === file.id);
                    return (
                      <button
                        key={file.id}
                        onClick={() => toggleFileSelection(file)}
                        className={`w-full flex items-center gap-3 p-3 text-left hover-elevate transition-colors ${
                          isSelected ? "bg-accent" : ""
                        }`}
                        data-testid={`drive-file-${file.id}`}
                      >
                        <div className={`w-6 h-6 rounded border flex items-center justify-center ${
                          isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
                        }`}>
                          {isSelected && <Check className="h-4 w-4 text-primary-foreground" />}
                        </div>
                        {file.thumbnailLink ? (
                          <img
                            src={file.thumbnailLink}
                            alt=""
                            className="w-10 h-10 object-cover rounded"
                          />
                        ) : (
                          <div className="w-10 h-10 flex items-center justify-center bg-muted rounded">
                            {getFileIcon(file.mimeType)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(file.modifiedTime)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            <div className="flex items-center justify-between pt-2 border-t">
              <p className="text-sm text-muted-foreground">
                {selectedFiles.length} file{selectedFiles.length !== 1 ? "s" : ""} selected
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  data-testid="button-drive-cancel"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={selectedFiles.length === 0 || isImporting}
                  data-testid="button-drive-import"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    `Import ${selectedFiles.length > 0 ? `(${selectedFiles.length})` : ""}`
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
