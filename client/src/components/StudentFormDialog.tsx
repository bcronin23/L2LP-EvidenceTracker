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
import { useEffect } from "react";

const studentFormSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  classGroup: z.string().max(50).optional(),
  yearGroup: z.string().max(20).optional(),
  programmeId: z.string().min(1, "Programme is required"),
  notes: z.string().optional(),
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

  const { data: programmes, isLoading: programmesLoading } = useQuery<Programme[]>({
    queryKey: ["/api/programmes"],
  });

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      classGroup: "",
      yearGroup: "",
      programmeId: "",
      notes: "",
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
      });
    } else {
      form.reset({
        firstName: "",
        lastName: "",
        classGroup: "",
        yearGroup: "",
        programmeId: "",
        notes: "",
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
