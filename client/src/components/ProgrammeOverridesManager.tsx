import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Settings, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Student, Programme, StudentProgrammeOverride } from "@shared/schema";

const AREA_LABELS: Record<string, string> = {
  COMM_LIT: "Communication & Literacy",
  NUMERACY: "Numeracy",
  PERSONAL_CARE: "Personal Care",
  COMMUNITY: "Being Part of My Community",
  PREP_FOR_WORK: "Preparing for Work",
  ARTS_VISUAL: "Creative Arts - Visual",
  ARTS_MUSIC: "Creative Arts - Music",
  ARTS_DRAMA: "Creative Arts - Drama",
  PE: "Physical Education",
  COOKERY: "Cookery",
  MY_LIFE_MY_FINANCE: "My Life, My Finances",
  LOOKING_AFTER_MY_ENV: "Looking After My Environment",
};

const AREA_CODES = Object.keys(AREA_LABELS);

interface ProgrammeOverridesManagerProps {
  student: Student;
}

export function ProgrammeOverridesManager({ student }: ProgrammeOverridesManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteOverrideId, setDeleteOverrideId] = useState<string | null>(null);
  const [selectedAreaCode, setSelectedAreaCode] = useState<string>("");
  const [selectedProgrammeId, setSelectedProgrammeId] = useState<string>("");

  const { data: programmes } = useQuery<Programme[]>({
    queryKey: ["/api/programmes"],
  });

  const { data: overrides, isLoading } = useQuery<StudentProgrammeOverride[]>({
    queryKey: ["/api/students", student.id, "programme-overrides"],
    enabled: !!student.id,
  });

  const defaultProgramme = programmes?.find(p => p.id === student.programmeId);

  const createMutation = useMutation({
    mutationFn: async (data: { areaCode: string; programmeId: string }) => {
      return apiRequest("POST", `/api/students/${student.id}/programme-overrides`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students", student.id, "programme-overrides"] });
      queryClient.invalidateQueries({ queryKey: ["/api/students", student.id, "plu-coverage"] });
      setAddDialogOpen(false);
      setSelectedAreaCode("");
      setSelectedProgrammeId("");
      toast({ title: "Override added", description: "The subject area programme has been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add programme override.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/students/${student.id}/programme-overrides/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students", student.id, "programme-overrides"] });
      queryClient.invalidateQueries({ queryKey: ["/api/students", student.id, "plu-coverage"] });
      setDeleteOverrideId(null);
      toast({ title: "Override removed", description: "The subject will now use the default programme." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove programme override.", variant: "destructive" });
    },
  });

  const existingAreaCodes = new Set(overrides?.map(o => o.areaCode) || []);
  const availableAreaCodes = AREA_CODES.filter(code => !existingAreaCodes.has(code));

  const handleAddOverride = () => {
    if (!selectedAreaCode || !selectedProgrammeId) return;
    createMutation.mutate({ areaCode: selectedAreaCode, programmeId: selectedProgrammeId });
  };

  const getProgrammeTitle = (programmeId: string) => {
    return programmes?.find(p => p.id === programmeId)?.title || "Unknown";
  };

  const getProgrammeBadgeVariant = (programmeId: string) => {
    const programme = programmes?.find(p => p.id === programmeId);
    if (!programme) return "secondary";
    if (programme.code.includes("L1")) return "outline";
    return "secondary";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Programme Settings</CardTitle>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAddDialogOpen(true)}
            disabled={availableAreaCodes.length === 0}
            data-testid="button-add-programme-override"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Override
          </Button>
        </div>
        <CardDescription>
          Configure different programme levels for specific subject areas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Default Programme</span>
          </div>
          <Badge variant="secondary">{defaultProgramme?.title || "Not set"}</Badge>
        </div>

        {isLoading ? (
          <div className="text-center py-4 text-sm text-muted-foreground">Loading...</div>
        ) : overrides && overrides.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Subject Area Overrides</p>
            {overrides.map((override) => (
              <div
                key={override.id}
                className="flex items-center justify-between p-3 rounded-lg border"
                data-testid={`override-${override.areaCode}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {AREA_LABELS[override.areaCode] || override.areaCode}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getProgrammeBadgeVariant(override.programmeId)}>
                    {getProgrammeTitle(override.programmeId)}
                  </Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setDeleteOverrideId(override.id)}
                    data-testid={`button-delete-override-${override.areaCode}`}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">
            No overrides set. This student uses the default programme for all subjects.
          </p>
        )}
      </CardContent>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Programme Override</DialogTitle>
            <DialogDescription>
              Select a subject area and the programme level to use for that area.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Subject Area</Label>
              <Select value={selectedAreaCode} onValueChange={setSelectedAreaCode}>
                <SelectTrigger data-testid="select-area-code">
                  <SelectValue placeholder="Select subject area..." />
                </SelectTrigger>
                <SelectContent>
                  {availableAreaCodes.map((code) => (
                    <SelectItem key={code} value={code}>
                      {AREA_LABELS[code]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Programme Level</Label>
              <Select value={selectedProgrammeId} onValueChange={setSelectedProgrammeId}>
                <SelectTrigger data-testid="select-programme">
                  <SelectValue placeholder="Select programme..." />
                </SelectTrigger>
                <SelectContent>
                  {programmes?.map((programme) => (
                    <SelectItem key={programme.id} value={programme.id}>
                      {programme.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddOverride}
              disabled={!selectedAreaCode || !selectedProgrammeId || createMutation.isPending}
              data-testid="button-confirm-add-override"
            >
              {createMutation.isPending ? "Adding..." : "Add Override"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteOverrideId} onOpenChange={() => setDeleteOverrideId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Programme Override?</AlertDialogTitle>
            <AlertDialogDescription>
              This subject area will use the student's default programme.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteOverrideId && deleteMutation.mutate(deleteOverrideId)}
              data-testid="button-confirm-delete-override"
            >
              {deleteMutation.isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
