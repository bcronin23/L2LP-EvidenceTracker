import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, Search, User, ChevronRight, FileText, Archive, ArchiveRestore, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LoadingPage } from "@/components/LoadingSpinner";
import { MobileHeader } from "@/components/MobileHeader";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { MobileNav } from "@/components/MobileNav";
import { StudentFormDialog } from "@/components/StudentFormDialog";
import type { StudentWithStats } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Students() {
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: students, isLoading } = useQuery<StudentWithStats[]>({
    queryKey: ["/api/students"],
  });

  const archiveMutation = useMutation({
    mutationFn: async (studentId: string) => {
      return apiRequest("POST", `/api/students/${studentId}/archive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      toast({
        title: "Student archived",
        description: "The student has been moved to archive.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to archive student.",
        variant: "destructive",
      });
    },
  });

  const unarchiveMutation = useMutation({
    mutationFn: async (studentId: string) => {
      return apiRequest("POST", `/api/students/${studentId}/unarchive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      toast({
        title: "Student restored",
        description: "The student has been restored from archive.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to restore student.",
        variant: "destructive",
      });
    },
  });

  const filteredStudents = students?.filter((student) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      student.firstName.toLowerCase().includes(searchLower) ||
      student.classGroup?.toLowerCase().includes(searchLower);
    
    const isArchived = !!(student as any).archivedAt;
    const matchesArchiveFilter = showArchived ? isArchived : !isArchived;
    
    return matchesSearch && matchesArchiveFilter;
  });

  const archivedCount = students?.filter((s) => !!(s as any).archivedAt).length || 0;
  const activeCount = (students?.length || 0) - archivedCount;

  const handleArchive = (e: React.MouseEvent, studentId: string) => {
    e.preventDefault();
    e.stopPropagation();
    archiveMutation.mutate(studentId);
  };

  const handleUnarchive = (e: React.MouseEvent, studentId: string) => {
    e.preventDefault();
    e.stopPropagation();
    unarchiveMutation.mutate(studentId);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DesktopSidebar />

      <div className="flex-1 flex flex-col pb-20 md:pb-0">
        <MobileHeader title="Students" />

        <div className="hidden md:flex items-center justify-between gap-4 p-6 border-b">
          <h1 className="text-2xl font-semibold">Students</h1>
          <Button onClick={() => setDialogOpen(true)} data-testid="button-add-student">
            <Plus className="h-4 w-4 mr-2" />
            Add Student
          </Button>
        </div>

        <main className="flex-1 p-4 md:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search students..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                data-testid="input-search-students"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="show-archived"
                checked={showArchived}
                onCheckedChange={setShowArchived}
                data-testid="switch-show-archived"
              />
              <Label htmlFor="show-archived" className="text-sm cursor-pointer">
                Show archived ({archivedCount})
              </Label>
            </div>
          </div>

          {!showArchived && activeCount > 0 && archivedCount > 0 && (
            <p className="text-sm text-muted-foreground">
              Showing {activeCount} active student{activeCount !== 1 ? "s" : ""}. Toggle above to view {archivedCount} archived.
            </p>
          )}

          {isLoading ? (
            <LoadingPage />
          ) : filteredStudents?.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {search ? "No students found" : showArchived ? "No archived students" : "No students yet"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {search
                  ? "Try a different search term"
                  : showArchived
                  ? "Students you archive will appear here"
                  : "Add your first student to get started"}
              </p>
              {!search && !showArchived && (
                <Button onClick={() => setDialogOpen(true)} data-testid="button-add-first-student">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Student
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStudents?.map((student) => {
                const isArchived = !!(student as any).archivedAt;
                return (
                  <Link key={student.id} href={`/students/${student.id}`}>
                    <Card 
                      className={`hover-elevate cursor-pointer transition-colors ${isArchived ? "opacity-70" : ""}`} 
                      data-testid={`card-student-${student.id}`}
                    >
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${isArchived ? "bg-muted" : "bg-accent"}`}>
                          <span className={`text-lg font-semibold ${isArchived ? "text-muted-foreground" : "text-accent-foreground"}`}>
                            {student.firstName}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium truncate">
                              {student.firstName}
                            </h3>
                            {isArchived && (
                              <Badge variant="outline" className="text-xs flex-shrink-0">
                                <Archive className="h-3 w-3 mr-1" />
                                Archived
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {student.classGroup && (
                              <Badge variant="secondary" className="text-xs">
                                {student.classGroup}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {student.evidenceCount || 0} evidence
                            </span>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                            <Button variant="ghost" size="icon" className="flex-shrink-0" data-testid={`menu-student-${student.id}`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {isArchived ? (
                              <DropdownMenuItem 
                                onClick={(e) => handleUnarchive(e, student.id)}
                                data-testid={`button-unarchive-${student.id}`}
                              >
                                <ArchiveRestore className="h-4 w-4 mr-2" />
                                Restore from Archive
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem 
                                onClick={(e) => handleArchive(e, student.id)}
                                data-testid={`button-archive-${student.id}`}
                              >
                                <Archive className="h-4 w-4 mr-2" />
                                Archive Student
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </main>

        <Button
          className="fixed bottom-24 right-4 md:hidden rounded-full h-14 w-14 shadow-lg"
          size="icon"
          onClick={() => setDialogOpen(true)}
          data-testid="fab-add-student"
        >
          <Plus className="h-6 w-6" />
        </Button>

        <MobileNav />
      </div>

      <StudentFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
