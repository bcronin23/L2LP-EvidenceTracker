import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Search,
  Filter,
  FolderOpen,
  Calendar,
  Camera,
  Video,
  FileText,
  Mic,
  File,
  X,
  Building,
  MapPin,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { LoadingPage } from "@/components/LoadingSpinner";
import { MobileHeader } from "@/components/MobileHeader";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { MobileNav } from "@/components/MobileNav";
import { EvidenceDetailDialog } from "@/components/EvidenceDetailDialog";
import type { EvidenceWithOutcomes, Student, LearningOutcome } from "@shared/schema";

const evidenceTypeIcons: Record<string, typeof Camera> = {
  photo: Camera,
  video: Video,
  work_sample: FileText,
  audio: Mic,
  other: File,
};

const evidenceTypes = [
  { value: "all", label: "All Types" },
  { value: "photo", label: "Photo" },
  { value: "video", label: "Video" },
  { value: "work_sample", label: "Work Sample" },
  { value: "audio", label: "Audio" },
  { value: "other", label: "Other" },
];

const settingOptions = [
  { value: "all", label: "All Settings" },
  { value: "classroom", label: "Classroom" },
  { value: "community", label: "Community" },
];

export default function EvidenceLibrary() {
  const [search, setSearch] = useState("");
  const [studentFilter, setStudentFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [settingFilter, setSettingFilter] = useState("all");
  const [pluFilter, setPluFilter] = useState("all");
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceWithOutcomes | null>(null);

  const { data: evidence, isLoading: evidenceLoading } = useQuery<EvidenceWithOutcomes[]>({
    queryKey: ["/api/evidence"],
  });

  const { data: students } = useQuery<Student[]>({
    queryKey: ["/api/students"],
  });

  const { data: outcomes } = useQuery<LearningOutcome[]>({
    queryKey: ["/api/outcomes"],
  });

  const plus = useMemo(() => {
    if (!outcomes) return [];
    const pluMap = new Map<string, string>();
    outcomes.forEach((o) => {
      const code = o.pluOrModuleCode || (o.pluNumber !== null ? String(o.pluNumber) : null);
      const title = o.pluOrModuleTitle || o.pluName || '';
      if (code) {
        pluMap.set(code, title);
      }
    });
    return Array.from(pluMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [outcomes]);

  const filteredEvidence = useMemo(() => {
    if (!evidence) return [];
    return evidence.filter((item) => {
      const matchesSearch =
        search === "" ||
        item.assessmentActivity?.toLowerCase().includes(search.toLowerCase()) ||
        item.observations?.toLowerCase().includes(search.toLowerCase()) ||
        item.student?.firstName.toLowerCase().includes(search.toLowerCase()) ||
        item.student?.lastName.toLowerCase().includes(search.toLowerCase()) ||
        item.outcomes?.some((o) => o.outcomeCode.toLowerCase().includes(search.toLowerCase()));

      const matchesStudent = studentFilter === "all" || item.studentId === studentFilter;
      const matchesType = typeFilter === "all" || item.evidenceType === typeFilter;
      const matchesSetting = settingFilter === "all" || item.setting === settingFilter;
      const matchesPlu =
        pluFilter === "all" ||
        item.outcomes?.some((o) => {
          const code = o.pluOrModuleCode || (o.pluNumber !== null ? String(o.pluNumber) : null);
          return code === pluFilter;
        });

      return matchesSearch && matchesStudent && matchesType && matchesSetting && matchesPlu;
    });
  }, [evidence, search, studentFilter, typeFilter, settingFilter, pluFilter]);

  const hasActiveFilters =
    studentFilter !== "all" ||
    typeFilter !== "all" ||
    settingFilter !== "all" ||
    pluFilter !== "all";

  const clearFilters = () => {
    setStudentFilter("all");
    setTypeFilter("all");
    setSettingFilter("all");
    setPluFilter("all");
    setSearch("");
  };

  const FiltersContent = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Student</Label>
        <Select value={studentFilter} onValueChange={setStudentFilter}>
          <SelectTrigger data-testid="select-filter-student">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Students</SelectItem>
            {students?.map((student) => (
              <SelectItem key={student.id} value={student.id}>
                {student.firstName} {student.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Evidence Type</Label>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger data-testid="select-filter-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {evidenceTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Setting</Label>
        <Select value={settingFilter} onValueChange={setSettingFilter}>
          <SelectTrigger data-testid="select-filter-setting">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {settingOptions.map((setting) => (
              <SelectItem key={setting.value} value={setting.value}>
                {setting.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Priority Learning Unit</Label>
        <Select value={pluFilter} onValueChange={setPluFilter}>
          <SelectTrigger data-testid="select-filter-plu">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All PLUs</SelectItem>
            {plus.map(([pluCode, pluTitle]) => (
              <SelectItem key={pluCode} value={pluCode}>
                {pluTitle || pluCode}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasActiveFilters && (
        <Button variant="outline" onClick={clearFilters} className="w-full">
          <X className="h-4 w-4 mr-2" />
          Clear Filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <DesktopSidebar />

      <div className="flex-1 flex flex-col pb-20 md:pb-0">
        <MobileHeader title="Evidence Library" />

        <div className="hidden md:flex items-center justify-between gap-4 p-6 border-b">
          <h1 className="text-2xl font-semibold">Evidence Library</h1>
          <Badge variant="secondary" className="text-sm">
            {filteredEvidence.length} of {evidence?.length || 0} items
          </Badge>
        </div>

        <main className="flex-1 p-4 md:p-6">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="hidden lg:block w-64 flex-shrink-0">
              <div className="sticky top-6 space-y-4">
                <h3 className="font-semibold">Filters</h3>
                <FiltersContent />
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search evidence..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-evidence"
                  />
                </div>
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="lg:hidden" data-testid="button-filter-mobile">
                      <Filter className="h-4 w-4 mr-2" />
                      Filters
                      {hasActiveFilters && (
                        <Badge variant="secondary" className="ml-2">
                          Active
                        </Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right">
                    <SheetHeader>
                      <SheetTitle>Filters</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4">
                      <FiltersContent />
                    </div>
                  </SheetContent>
                </Sheet>
              </div>

              {hasActiveFilters && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground">Active filters:</span>
                  {studentFilter !== "all" && (
                    <Badge
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => setStudentFilter("all")}
                    >
                      {students?.find((s) => s.id === studentFilter)?.firstName}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  )}
                  {typeFilter !== "all" && (
                    <Badge
                      variant="secondary"
                      className="cursor-pointer capitalize"
                      onClick={() => setTypeFilter("all")}
                    >
                      {typeFilter.replace("_", " ")}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  )}
                  {settingFilter !== "all" && (
                    <Badge
                      variant="secondary"
                      className="cursor-pointer capitalize"
                      onClick={() => setSettingFilter("all")}
                    >
                      {settingFilter}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  )}
                  {pluFilter !== "all" && (
                    <Badge
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => setPluFilter("all")}
                    >
                      PLU {pluFilter}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  )}
                </div>
              )}

              {evidenceLoading ? (
                <LoadingPage />
              ) : filteredEvidence.length === 0 ? (
                <div className="text-center py-12">
                  <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {search || hasActiveFilters ? "No evidence found" : "No evidence yet"}
                  </h3>
                  <p className="text-muted-foreground">
                    {search || hasActiveFilters
                      ? "Try different search terms or filters"
                      : "Upload your first evidence to get started"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredEvidence.map((item) => {
                    const Icon = evidenceTypeIcons[item.evidenceType] || File;
                    return (
                      <Card
                        key={item.id}
                        className="hover-elevate cursor-pointer transition-colors"
                        onClick={() => setSelectedEvidence(item)}
                        data-testid={`card-library-evidence-${item.id}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-md bg-accent flex items-center justify-center flex-shrink-0">
                              <Icon className="h-6 w-6 text-accent-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">
                                  {item.student?.firstName} {item.student?.lastName}
                                </span>
                                <Badge variant="secondary" className="capitalize text-xs flex items-center gap-1">
                                  {item.setting === "classroom" ? (
                                    <Building className="h-3 w-3" />
                                  ) : (
                                    <MapPin className="h-3 w-3" />
                                  )}
                                  {item.setting}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                                {item.assessmentActivity || item.observations || "No description"}
                              </p>
                              <div className="flex items-center gap-2 flex-wrap">
                                {item.outcomes?.slice(0, 2).map((outcome) => (
                                  <Badge key={outcome.id} variant="secondary" className="text-xs font-mono">
                                    {outcome.outcomeCode}
                                  </Badge>
                                ))}
                                {(item.outcomes?.length || 0) > 2 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{item.outcomes!.length - 2}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(item.dateOfActivity), "dd MMM")}
                              </p>
                              <Badge variant="outline" className="text-xs mt-1 capitalize">
                                {item.independenceLevel}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </main>

        <MobileNav />
      </div>

      <EvidenceDetailDialog
        evidence={selectedEvidence}
        onClose={() => setSelectedEvidence(null)}
      />
    </div>
  );
}
