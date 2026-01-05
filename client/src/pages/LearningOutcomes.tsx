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
import type { LearningOutcome } from "@shared/schema";

export default function LearningOutcomes() {
  const [search, setSearch] = useState("");
  const [pluFilter, setPluFilter] = useState<string>("all");
  const [expandedPLUs, setExpandedPLUs] = useState<Set<number>>(new Set([1, 2, 3, 4, 5]));

  const { data: outcomes, isLoading } = useQuery<LearningOutcome[]>({
    queryKey: ["/api/outcomes"],
  });

  const plus = useMemo(() => {
    if (!outcomes) return [];
    const pluMap = new Map<number, string>();
    outcomes.forEach((o) => pluMap.set(o.pluNumber, o.pluName));
    return Array.from(pluMap.entries()).sort((a, b) => a[0] - b[0]);
  }, [outcomes]);

  const filteredOutcomes = useMemo(() => {
    if (!outcomes) return [];
    return outcomes.filter((outcome) => {
      const matchesSearch =
        search === "" ||
        outcome.outcomeCode.toLowerCase().includes(search.toLowerCase()) ||
        outcome.outcomeText.toLowerCase().includes(search.toLowerCase()) ||
        outcome.pluName.toLowerCase().includes(search.toLowerCase()) ||
        outcome.elementName.toLowerCase().includes(search.toLowerCase());

      const matchesPlu = pluFilter === "all" || outcome.pluNumber.toString() === pluFilter;

      return matchesSearch && matchesPlu;
    });
  }, [outcomes, search, pluFilter]);

  const groupedOutcomes = useMemo(() => {
    const groups = new Map<number, { pluName: string; elements: Map<string, LearningOutcome[]> }>();
    
    filteredOutcomes.forEach((outcome) => {
      if (!groups.has(outcome.pluNumber)) {
        groups.set(outcome.pluNumber, { pluName: outcome.pluName, elements: new Map() });
      }
      const plu = groups.get(outcome.pluNumber)!;
      if (!plu.elements.has(outcome.elementName)) {
        plu.elements.set(outcome.elementName, []);
      }
      plu.elements.get(outcome.elementName)!.push(outcome);
    });
    
    return groups;
  }, [filteredOutcomes]);

  const togglePLU = (pluNumber: number) => {
    setExpandedPLUs((prev) => {
      const next = new Set(prev);
      if (next.has(pluNumber)) {
        next.delete(pluNumber);
      } else {
        next.add(pluNumber);
      }
      return next;
    });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DesktopSidebar />

      <div className="flex-1 flex flex-col pb-20 md:pb-0">
        <MobileHeader title="Learning Outcomes" />

        <div className="hidden md:flex items-center justify-between gap-4 p-6 border-b">
          <h1 className="text-2xl font-semibold">L2LP Learning Outcomes</h1>
          <Badge variant="secondary" className="text-sm">
            {outcomes?.length || 0} outcomes across 5 PLUs
          </Badge>
        </div>

        <main className="flex-1 p-4 md:p-6 space-y-4">
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
            <Select value={pluFilter} onValueChange={setPluFilter}>
              <SelectTrigger className="w-full sm:w-[250px]" data-testid="select-plu-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by PLU" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority Learning Units</SelectItem>
                {plus.map(([pluNumber, pluName]) => (
                  <SelectItem key={pluNumber} value={pluNumber.toString()}>
                    PLU {pluNumber}: {pluName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <LoadingPage />
          ) : filteredOutcomes.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {search || pluFilter !== "all"
                  ? "No outcomes found"
                  : "No learning outcomes yet"}
              </h3>
              <p className="text-muted-foreground">
                {search || pluFilter !== "all"
                  ? "Try different search terms or filters"
                  : "Learning outcomes will appear here once imported"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {Array.from(groupedOutcomes.entries())
                .sort((a, b) => a[0] - b[0])
                .map(([pluNumber, plu]) => (
                  <Card key={pluNumber}>
                    <button
                      type="button"
                      className="w-full p-4 flex items-center gap-3 text-left hover-elevate rounded-t-md"
                      onClick={() => togglePLU(pluNumber)}
                      data-testid={`button-toggle-plu-${pluNumber}`}
                    >
                      {expandedPLUs.has(pluNumber) ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      )}
                      <Badge variant="default" className="font-mono flex-shrink-0">
                        PLU {pluNumber}
                      </Badge>
                      <h2 className="text-lg font-semibold flex-1">{plu.pluName}</h2>
                      <Badge variant="secondary">
                        {Array.from(plu.elements.values()).flat().length} outcomes
                      </Badge>
                    </button>

                    {expandedPLUs.has(pluNumber) && (
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
                                    className="flex items-start gap-3 p-3 rounded-md bg-muted/50"
                                    data-testid={`card-outcome-${outcome.outcomeCode}`}
                                  >
                                    <Badge variant="outline" className="flex-shrink-0 font-mono text-xs">
                                      {outcome.outcomeCode}
                                    </Badge>
                                    <p className="text-sm text-muted-foreground flex-1">
                                      {outcome.outcomeText}
                                    </p>
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
