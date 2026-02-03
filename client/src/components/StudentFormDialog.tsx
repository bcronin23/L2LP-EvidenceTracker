import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Student, Programme } from "@shared/schema";
import { useEffect, useState, useRef } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Camera, Trash2, Loader2, ExternalLink, FolderOpen } from "lucide-react";

const isGoogleDriveUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes("google.com") || parsed.hostname.includes("drive.google");
  } catch {
    return false;
  }
};

const studentFormSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  classGroup: z.string().max(50).optional(),
  yearGroup: z.string().max(20).optional(),
  programmeId: z.string().min(1, "Programme is required"),
  notes: z.string().optional(),
  driveFolderUrl: z.string()
    .refine((val) => !val || isGoogleDriveUrl(val), {
      message: "Please enter a valid Google Drive URL",
    })
    .optional()
    .or(z.literal("")),
});

type StudentFormValues = z.infer<typeof studentFormSchema>;

interface StudentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: Student;
}

export function StudentFormDialog({
  open,
  onOpenChange,
  student,
}: StudentFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!student;
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const { data: programmes, isLoading: programmesLoading } = useQuery<Programme[]>({
    queryKey: ["/api/programmes"],
  });

  // Fetch signed URL for existing photo
  useEffect(() => {
    if (student?.photoStoragePath) {
      fetch(`/api/students/${student.id}/photo-url`)
        .then(res => res.ok ? res.json() : null)
        .then(data => setPhotoUrl(data?.signedUrl || null))
        .catch(() => setPhotoUrl(null));
    } else {
      setPhotoUrl(null);
    }
  }, [student?.id, student?.photoStoragePath]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !student) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image must be less than 5MB", variant: "destructive" });
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const response = await fetch(`/api/students/${student.id}/photo-upload-url`);
      if (!response.ok) throw new Error("Failed to get upload URL");
      const { uploadUrl } = await response.json();

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!uploadResponse.ok) throw new Error("Upload failed");

      const url = new URL(uploadUrl);
      const storagePath = url.pathname;

      await apiRequest("PATCH", `/api/students/${student.id}/photo`, {
        storagePath,
        fileName: file.name,
        mimeType: file.type,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/students", student.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });

      // Refresh photo URL
      const newPhotoRes = await fetch(`/api/students/${student.id}/photo-url`);
      if (newPhotoRes.ok) {
        const data = await newPhotoRes.json();
        setPhotoUrl(data.signedUrl);
      }

      toast({ title: "Photo uploaded successfully" });
    } catch (error) {
      console.error("Photo upload error:", error);
      toast({ title: "Failed to upload photo", variant: "destructive" });
    } finally {
      setIsUploadingPhoto(false);
      if (photoInputRef.current) {
        photoInputRef.current.value = "";
      }
    }
  };

  const handleRemovePhoto = async () => {
    if (!student) return;
    
    try {
      await apiRequest("DELETE", `/api/students/${student.id}/photo`);
      setPhotoUrl(null);
      queryClient.invalidateQueries({ queryKey: ["/api/students", student.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      toast({ title: "Photo removed" });
    } catch (error) {
      toast({ title: "Failed to remove photo", variant: "destructive" });
    }
  };

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      classGroup: "",
      yearGroup: "",
      programmeId: "",
      notes: "",
      driveFolderUrl: "",
    },
  });

  useEffect(() => {
    if (student) {
      form.reset({
        firstName: student.firstName || "",
        lastName: student.lastName || "",
        classGroup: student.classGroup || "",
        yearGroup: student.yearGroup || "",
        programmeId: student.programmeId || "",
        notes: student.notes || "",
        driveFolderUrl: student.driveFolderUrl || "",
      });
    } else {
      form.reset({
        firstName: "",
        lastName: "",
        classGroup: "",
        yearGroup: "",
        programmeId: "",
        notes: "",
        driveFolderUrl: "",
      });
    }
  }, [student, form, open]);

  const createMutation = useMutation({
    mutationFn: async (data: StudentFormValues) => {
      const res = await apiRequest("POST", "/api/students", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      toast({ title: "Student added successfully" });
      form.reset();
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Failed to add student",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: StudentFormValues) => {
      const res = await apiRequest("PATCH", `/api/students/${student?.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/students", student?.id] });
      toast({ title: "Student updated successfully" });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Failed to update student",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: StudentFormValues) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const groupedProgrammes = programmes?.reduce((acc, prog) => {
    const cycle = prog.code.startsWith("JC_") ? "Junior Cycle" : "Senior Cycle";
    if (!acc[cycle]) acc[cycle] = [];
    acc[cycle].push(prog);
    return acc;
  }, {} as Record<string, Programme[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Student" : "Add Student"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {isEditing && (
              <div className="flex items-center gap-4 pb-2 border-b">
                <div className="relative">
                  <Avatar className="h-16 w-16">
                    {photoUrl ? (
                      <AvatarImage src={photoUrl} alt={`${student?.firstName} ${student?.lastName}`} />
                    ) : null}
                    <AvatarFallback className="text-lg">
                      {student?.firstName?.[0]}{student?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  {isUploadingPhoto && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    data-testid="input-student-photo"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    data-testid="button-upload-photo"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    {photoUrl ? "Change Photo" : "Upload Photo"}
                  </Button>
                  {photoUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemovePhoto}
                      className="text-destructive"
                      data-testid="button-remove-photo"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} data-testid="input-first-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} data-testid="input-last-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="programmeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Programme</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    disabled={programmesLoading}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-programme">
                        <SelectValue placeholder={programmesLoading ? "Loading..." : "Select programme"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {groupedProgrammes && Object.entries(groupedProgrammes).map(([cycle, progs]) => (
                        <div key={cycle}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                            {cycle}
                          </div>
                          {progs.map((prog) => (
                            <SelectItem key={prog.id} value={prog.id}>
                              {prog.title}
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select the primary learning programme for this student
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="classGroup"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class Group</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 3A" {...field} data-testid="input-class-group" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="yearGroup"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year Group</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 3rd Year" {...field} data-testid="input-year-group" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about the student..."
                      className="resize-none"
                      rows={3}
                      {...field}
                      data-testid="textarea-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="driveFolderUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4" />
                    Google Drive Evidence Folder
                  </FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        placeholder="https://drive.google.com/drive/folders/..."
                        {...field}
                        data-testid="input-drive-folder-url"
                      />
                    </FormControl>
                    {field.value && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => window.open(field.value, "_blank")}
                        data-testid="button-open-drive-folder"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <FormDescription>
                    Paste the link to this student's evidence folder in Google Drive
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-submit-student">
                {isPending ? "Saving..." : isEditing ? "Save Changes" : "Add Student"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
