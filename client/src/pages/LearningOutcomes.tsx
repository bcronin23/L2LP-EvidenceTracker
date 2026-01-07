import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, BookOpen, Filter, ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingPage } from "@/components/LoadingSpinner";
import { MobileHeader } from "@/components/MobileHeader";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { MobileNav } from "@/components/MobileNav";
import type { LearningOutcome, Programme } from "@shared/schema";

export default function LearningOutcomes() {
  const [search, setSearch] = useState("");
  const [programmeFilter, setProgrammeFilter] = useState<string>("all");
  const [pluFilter, setPluFilter] = useState<string>("all");
  const [expandedPLUs, setExpandedPLUs] = useState<Set<string>>(new Set());

  const { data: outcomes, isLoading } = useQuery<LearningOutcome[]>({
    queryKey: ["/api/outcomes"],
  });

  const { data: programmes } = useQuery<Programme[]>({
    queryKey: ["/api/programmes"],
  });

  const filteredOutcomes = useMemo(() => {
    if (!outcomes) return [];
    return outcomes.filter((outcome) => {
      const pluName = outcome.pluOrModuleTitle || outcome.pluName || "";
      const elementName = outcome.elementName || "";
      
      const matchesSearch =
        search === "" ||
        outcome.outcomeCode.toLowerCase().includes(search.toLowerCase()) ||
        outcome.outcomeText.toLowerCase().includes(search.toLowerCase()) ||
        pluName.toLowerCase().includes(search.toLowerCase()) ||
        elementName.toLowerCase().includes(search.toLowerCase());

      const pluCode = outcome.pluOrModuleCode || String(outcome.pluNumber || 0);
      const matchesPlu = pluFilter === "all" || pluCode === pluFilter;
      
      const matchesProgramme = programmeFilter === "all" || outcome.programmeId === programmeFilter;

      return matchesSearch && matchesPlu && matchesProgramme;
    });
  }, [outcomes, search, pluFilter, programmeFilter]);

  const plus = useMemo(() => {
    if (!filteredOutcomes) return [];
    const pluMap = new Map<string, string>();
    filteredOutcomes.forEach((o) => {
      const code = o.pluOrModuleCode || String(o.pluNumber || 0);
      const name = o.pluOrModuleTitle || o.pluName || code;
      pluMap.set(code, name);
    });
    return Array.from(pluMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredOutcomes]);

  const groupedOutcomes = useMemo(() => {
    const groups = new Map<string, { pluCode: string; pluName: string; elements: Map<string, LearningOutcome[]> }>();
    
    filteredOutcomes.forEach((outcome) => {
      const pluCode = outcome.pluOrModuleCode || String(outcome.pluNumber || 0);
      const pluName = outcome.pluOrModuleTitle || outcome.pluName || pluCode;
      const elementName = outcome.elementName || "General";
      
      if (!groups.has(pluCode)) {
        groups.set(pluCode, { pluCode, pluName, elements: new Map() });
      }
      const plu = groups.get(pluCode)!;
      if (!plu.elements.has(elementName)) {
        plu.elements.set(elementName, []);
      }
      plu.elements.get(elementName)!.push(outcome);
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

  const expandAll = () => {
    setExpandedPLUs(new Set(plus.map(([code]) => code)));
  };

  const collapseAll = () => {
    setExpandedPLUs(new Set());
  };

  const totalOutcomes = outcomes?.length || 0;
  const selectedProgramme = programmes?.find(p => p.id === programmeFilter);

  return (
    <div className="flex min-h-screen bg-background">
      <DesktopSidebar />

      <div className="flex-1 flex flex-col pb-20 md:pb-0">
        <MobileHeader title="Learning Outcomes" />

        <div className="hidden md:flex items-center justify-between gap-4 p-6 border-b">
          <h1 className="text-2xl font-semibold">Learning Outcomes</h1>
          <Badge variant="secondary" className="text-sm">
            {filteredOutcomes.length} of {totalOutcomes} outcomes
          </Badge>
        </div>

        <main className="flex-1 p-4 md:p-6 space-y-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by code, description, or element..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-outcomes"
                />
              </div>
              <Select value={programmeFilter} onValueChange={(val) => {
                setProgrammeFilter(val);
                setPluFilter("all");
              }}>
                <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-programme-filter">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Programme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Programmes</SelectItem>
                  {programmes?.map((prog) => (
                    <SelectItem key={prog.id} value={prog.id}>
                      {prog.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {plus.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={pluFilter} onValueChange={setPluFilter}>
                  <SelectTrigger className="w-full sm:w-[300px]" data-testid="select-plu-filter">
                    <SelectValue placeholder="Filter by PLU/Module" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All PLUs/Modules</SelectItem>
                    {plus.map(([code, name]) => (
                      <SelectItem key={code} value={code}>
                        {code}: {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="text-sm text-muted-foreground hover:text-foreground"
                    onClick={expandAll}
                  >
                    Expand All
                  </button>
                  <span className="text-muted-foreground">/</span>
                  <button
                    type="button"
                    className="text-sm text-muted-foreground hover:text-foreground"
                    onClick={collapseAll}
                  >
                    Collapse All
                  </button>
                </div>
              </div>
            )}
          </div>

          {isLoading ? (
            <LoadingPage />
          ) : filteredOutcomes.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {search || pluFilter !== "all" || programmeFilter !== "all"
                  ? "No outcomes found"
                  : "No learning outcomes yet"}
              </h3>
              <p className="text-muted-foreground">
                {search || pluFilter !== "all" || programmeFilter !== "all"
                  ? "Try different search terms or filters"
                  : "Learning outcomes will appear here once imported"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {Array.from(groupedOutcomes.entries())
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([pluCode, plu]) => (
                  <Card key={pluCode}>
                    <button
                      type="button"
                      className="w-full p-4 flex items-center gap-3 text-left hover-elevate rounded-t-md"
                      onClick={() => togglePLU(pluCode)}
                      data-testid={`button-toggle-plu-${pluCode}`}
                    >
                      {expandedPLUs.has(pluCode) ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      )}
                      <Badge variant="default" className="font-mono flex-shrink-0">
                        {plu.pluCode}
                      </Badge>
                      <h2 className="text-lg font-semibold flex-1">{plu.pluName}</h2>
                      <Badge variant="secondary">
                        {Array.from(plu.elements.values()).flat().length} outcomes
                      </Badge>
                    </button>

                    {expandedPLUs.has(pluCode) && (
                      <CardContent className="pt-0 pb-4">
                        <div className="space-y-4 ml-8">
                          {Array.from(plu.elements.entries()).map(([elementName, elementOutcomes]) => (
                            <div key={elementName}>
                              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                                <BookOpen className="h-4 w-4" />
                                {elementName}
                                <Badge variant="outline" className="text-xs">
                                  {elementOutcomes.length}
                                </Badge>
                              </h3>
                              <div className="space-y-2">
                                {elementOutcomes.map((outcome) => (
                                  <div
                                    key={outcome.id}
                                    className="flex gap-3 p-3 rounded-md bg-accent/30"
                                    data-testid={`outcome-${outcome.outcomeCode}`}
                                  >
                                    <Badge variant="outline" className="font-mono text-xs flex-shrink-0">
                                      {outcome.outcomeCode}
                                    </Badge>
                                    <p className="text-sm">{outcome.outcomeText}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
            </div>
          )}
        </main>

        <MobileNav />
      </div>
    </div>
  );
}
