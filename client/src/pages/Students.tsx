import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, Search, User, ChevronRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingPage } from "@/components/LoadingSpinner";
import { MobileHeader } from "@/components/MobileHeader";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { MobileNav } from "@/components/MobileNav";
import { StudentFormDialog } from "@/components/StudentFormDialog";
import type { StudentWithStats } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Students() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: students, isLoading } = useQuery<StudentWithStats[]>({
    queryKey: ["/api/students"],
  });

  const filteredStudents = students?.filter((student) => {
    const searchLower = search.toLowerCase();
    return (
      student.firstName.toLowerCase().includes(searchLower) ||
      student.lastName.toLowerCase().includes(searchLower) ||
      student.classGroup?.toLowerCase().includes(searchLower)
    );
  });

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
          <div className="relative">
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

          {isLoading ? (
            <LoadingPage />
          ) : filteredStudents?.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {search ? "No students found" : "No students yet"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {search
                  ? "Try a different search term"
                  : "Add your first student to get started"}
              </p>
              {!search && (
                <Button onClick={() => setDialogOpen(true)} data-testid="button-add-first-student">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Student
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStudents?.map((student) => (
                <Link key={student.id} href={`/students/${student.id}`}>
                  <Card className="hover-elevate cursor-pointer transition-colors" data-testid={`card-student-${student.id}`}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                        <span className="text-lg font-semibold text-accent-foreground">
                          {student.firstName[0]}{student.lastName[0]}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">
                          {student.firstName} {student.lastName}
                        </h3>
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
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
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
