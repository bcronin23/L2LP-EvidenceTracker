import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, ChevronDown, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { EvidenceWithOutcomes, LearningOutcome, Student } from "@shared/schema";
import { cn } from "@/lib/utils";

interface EditOutcomesDialogProps {
  evidence: EvidenceWithOutcomes;
  student: Student | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditOutcomesDialog({ evidence, student, open, onOpenChange }: EditOutcomesDialogProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedOutcomeIds, setSelectedOutcomeIds] = useState<string[]>(
    evidence.outcomes?.map(o => o.id) || []
  );
  const [expandedPLUs, setExpandedPLUs] = useState<Set<string>>(new Set());

  const { data: allOutcomes, isLoading: loadingOutcomes } = useQuery<LearningOutcome[]>({
    queryKey: ["/api/outcomes"],
    enabled: open,
  });

  const updateMutation = useMutation({
    mutationFn: async (outcomeIds: string[]) => {
      return apiRequest("PATCH", `/api/evidence/${evidence.id}`, { outcomeIds });
    },
    onSuccess: () => {
      toast({ title: "Outcomes updated", description: "The learning outcomes have been saved." });
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/evidence"] });
      if (student) {
        queryClient.invalidateQueries({ queryKey: ["/api/students", student.id] });
      }
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update outcomes.", variant: "destructive" });
    },
  });

  const filteredOutcomes = useMemo(() => {
    if (!allOutcomes) return [];
    
    let filtered = allOutcomes;
    
    if (student?.programmeId) {
      filtered = filtered.filter(o => o.programmeId === student.programmeId);
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(o =>
        o.outcomeCode.toLowerCase().includes(searchLower) ||
        o.outcomeText.toLowerCase().includes(searchLower) ||
        (o.pluName && o.pluName.toLowerCase().includes(searchLower)) ||
        (o.elementName && o.elementName.toLowerCase().includes(searchLower))
      );
    }
    
    return filtered;
  }, [allOutcomes, student?.programmeId, search]);

  type PLUGroup = { pluName: string; pluCode: string; outcomes: LearningOutcome[] };
  const groupedOutcomes = useMemo((): Map<string, PLUGroup> => {
    const groups = new Map<string, PLUGroup>();
    
    filteredOutcomes.forEach((outcome) => {
      const pluCode = outcome.pluOrModuleCode || String(outcome.pluNumber || 0);
      const pluName = outcome.pluOrModuleTitle || outcome.pluName || pluCode;
      
      if (!groups.has(pluCode)) {
        groups.set(pluCode, { pluName, pluCode, outcomes: [] });
      }
      groups.get(pluCode)!.outcomes.push(outcome);
    });
    
    return groups;
  }, [filteredOutcomes]);

  const togglePLU = (pluCode: string) => {
    setExpandedPLUs((prev) => {
      const next = new Set(prev);
      if (next.has(pluCode)) {
        next.delete(pluCode);
      } else {
        next.add(pluCode);
      }
      return next;
    });
  };

  const toggleOutcome = (outcomeId: string) => {
    setSelectedOutcomeIds(prev => 
      prev.includes(outcomeId)
        ? prev.filter(id => id !== outcomeId)
        : [...prev, outcomeId]
    );
  };

  const handleSave = () => {
    updateMutation.mutate(selectedOutcomeIds);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Learning Outcomes</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search outcomes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              data-testid="input-search-outcomes"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">
              {selectedOutcomeIds.length} selected
            </Badge>
            {selectedOutcomeIds.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedOutcomeIds([])}
                data-testid="button-clear-outcomes"
              >
                Clear all
              </Button>
            )}
          </div>

          <ScrollArea className="flex-1 border rounded-md">
            <div className="p-2 space-y-1">
              {loadingOutcomes ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : groupedOutcomes.size === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {search ? "No outcomes match your search" : "No outcomes available"}
                </div>
              ) : (
                Array.from(groupedOutcomes.entries()).map(([pluCode, group]) => {
                  const isExpanded = expandedPLUs.has(pluCode);
                  const selectedInGroup = group.outcomes.filter(o => selectedOutcomeIds.includes(o.id)).length;
                  
                  return (
                    <div key={pluCode} className="border rounded-md overflow-hidden">
                      <button
                        type="button"
                        className="w-full flex items-center justify-between gap-2 p-3 hover-elevate bg-muted/50"
                        onClick={() => togglePLU(pluCode)}
                        data-testid={`button-toggle-plu-${pluCode}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 flex-shrink-0" />
                          )}
                          <span className="font-medium text-sm truncate">{group.pluName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedInGroup > 0 && (
                            <Badge variant="default" className="text-xs">
                              {selectedInGroup}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {group.outcomes.length}
                          </Badge>
                        </div>
                      </button>
                      
                      {isExpanded && (
                        <div className="border-t divide-y">
                          {group.outcomes.map((outcome) => (
                            <label
                              key={outcome.id}
                              className={cn(
                                "flex items-start gap-3 p-3 cursor-pointer hover-elevate transition-colors",
                                selectedOutcomeIds.includes(outcome.id) && "bg-accent/50"
                              )}
                              data-testid={`outcome-${outcome.id}`}
                            >
                              <Checkbox
                                checked={selectedOutcomeIds.includes(outcome.id)}
                                onCheckedChange={() => toggleOutcome(outcome.id)}
                                className="mt-0.5"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="font-mono text-xs flex-shrink-0">
                                    {outcome.outcomeCode}
                                  </Badge>
                                  {outcome.elementName && (
                                    <span className="text-xs text-muted-foreground truncate">
                                      {outcome.elementName}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm line-clamp-2">{outcome.outcomeText}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={updateMutation.isPending}
            data-testid="button-save-outcomes"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              `Save (${selectedOutcomeIds.length} outcomes)`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
