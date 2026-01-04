import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, BookOpen, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const [strandFilter, setStrandFilter] = useState<string>("all");

  const { data: outcomes, isLoading } = useQuery<LearningOutcome[]>({
    queryKey: ["/api/outcomes"],
  });

  const strands = useMemo(() => {
    if (!outcomes) return [];
    return [...new Set(outcomes.map((o) => o.strand))].sort();
  }, [outcomes]);

  const filteredOutcomes = useMemo(() => {
    if (!outcomes) return [];
    return outcomes.filter((outcome) => {
      const matchesSearch =
        search === "" ||
        outcome.code.toLowerCase().includes(search.toLowerCase()) ||
        outcome.description.toLowerCase().includes(search.toLowerCase()) ||
        outcome.strand.toLowerCase().includes(search.toLowerCase());

      const matchesStrand = strandFilter === "all" || outcome.strand === strandFilter;

      return matchesSearch && matchesStrand;
    });
  }, [outcomes, search, strandFilter]);

  const groupedOutcomes = useMemo(() => {
    const groups: Record<string, LearningOutcome[]> = {};
    filteredOutcomes.forEach((outcome) => {
      if (!groups[outcome.strand]) {
        groups[outcome.strand] = [];
      }
      groups[outcome.strand].push(outcome);
    });
    return groups;
  }, [filteredOutcomes]);

  return (
    <div className="flex min-h-screen bg-background">
      <DesktopSidebar />

      <div className="flex-1 flex flex-col pb-20 md:pb-0">
        <MobileHeader title="Learning Outcomes" />

        <div className="hidden md:flex items-center justify-between gap-4 p-6 border-b">
          <h1 className="text-2xl font-semibold">Learning Outcomes</h1>
          <Badge variant="secondary" className="text-sm">
            {outcomes?.length || 0} outcomes
          </Badge>
        </div>

        <main className="flex-1 p-4 md:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by code or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                data-testid="input-search-outcomes"
              />
            </div>
            <Select value={strandFilter} onValueChange={setStrandFilter}>
              <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-strand-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by strand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Strands</SelectItem>
                {strands.map((strand) => (
                  <SelectItem key={strand} value={strand}>
                    {strand}
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
                {search || strandFilter !== "all"
                  ? "No outcomes found"
                  : "No learning outcomes yet"}
              </h3>
              <p className="text-muted-foreground">
                {search || strandFilter !== "all"
                  ? "Try different search terms or filters"
                  : "Learning outcomes will appear here once imported"}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedOutcomes).map(([strand, outcomes]) => (
                <div key={strand}>
                  <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    {strand}
                    <Badge variant="secondary" className="ml-2">
                      {outcomes.length}
                    </Badge>
                  </h2>
                  <div className="space-y-2">
                    {outcomes.map((outcome) => (
                      <Card key={outcome.id} data-testid={`card-outcome-${outcome.code}`}>
                        <CardContent className="p-4 flex items-start gap-4">
                          <Badge variant="outline" className="flex-shrink-0 font-mono">
                            {outcome.code}
                          </Badge>
                          <p className="text-sm text-muted-foreground flex-1">
                            {outcome.description}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        <MobileNav />
      </div>
    </div>
  );
}
