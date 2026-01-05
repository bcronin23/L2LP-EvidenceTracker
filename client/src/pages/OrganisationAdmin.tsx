import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Users, Copy, RefreshCw, Shield, UserMinus, Check, Database, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { MobileHeader } from "@/components/MobileHeader";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { MobileNav } from "@/components/MobileNav";
import { LoadingPage, LoadingSpinner } from "@/components/LoadingSpinner";
import { useOrganisation } from "@/hooks/use-organisation";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface OrganisationMember {
  id: string;
  userId: string;
  role: "admin" | "staff";
  joinedAt: string;
}

export default function OrganisationAdmin() {
  const { membership, isAdmin, regenerateCode, isRegeneratingCode } = useOrganisation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copiedCode, setCopiedCode] = useState(false);

  const { data: members, isLoading: membersLoading } = useQuery<OrganisationMember[]>({
    queryKey: ["/api/organisation/members"],
    enabled: isAdmin,
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      return apiRequest("PATCH", `/api/organisation/members/${memberId}`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organisation/members"] });
      toast({ title: "Role updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update role", variant: "destructive" });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      return apiRequest("DELETE", `/api/organisation/members/${memberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organisation/members"] });
      toast({ title: "Member removed" });
    },
    onError: () => {
      toast({ title: "Failed to remove member", variant: "destructive" });
    },
  });

  const resetOutcomesMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/reset-outcomes");
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/outcomes"] });
      const pluTotals = data.pluTotals || {};
      toast({ 
        title: "Official L2LP Outcomes Imported",
        description: `${data.imported} outcomes: PLU1=${pluTotals[1]||0}, PLU2=${pluTotals[2]||0}, PLU3=${pluTotals[3]||0}, PLU4=${pluTotals[4]||0}, PLU5=${pluTotals[5]||0}`,
      });
    },
    onError: () => {
      toast({ title: "Failed to import outcomes", variant: "destructive" });
    },
  });

  const handleCopyCode = async () => {
    if (membership?.organisation.inviteCode) {
      await navigator.clipboard.writeText(membership.organisation.inviteCode);
      setCopiedCode(true);
      toast({ title: "Invite code copied to clipboard" });
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleRegenerateCode = async () => {
    try {
      await regenerateCode();
      toast({ title: "New invite code generated" });
    } catch {
      toast({ title: "Failed to generate new code", variant: "destructive" });
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen bg-background">
        <DesktopSidebar />
        <div className="flex-1 flex flex-col pb-20 md:pb-0">
          <MobileHeader title="Admin" />
          <main className="flex-1 flex items-center justify-center p-4">
            <div className="text-center">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-lg font-medium mb-2">Admin Access Required</h2>
              <p className="text-muted-foreground">
                Only school administrators can access this page.
              </p>
            </div>
          </main>
          <MobileNav />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <DesktopSidebar />

      <div className="flex-1 flex flex-col pb-20 md:pb-0">
        <MobileHeader title="School Admin" />

        <div className="hidden md:flex items-center justify-between gap-4 p-6 border-b">
          <h1 className="text-2xl font-semibold">School Administration</h1>
        </div>

        <main className="flex-1 p-4 md:p-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {membership?.organisation.name}
              </CardTitle>
              <CardDescription>
                Manage your school settings and team members
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Invite Code</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 bg-muted px-4 py-2 rounded-md text-lg tracking-widest font-mono" data-testid="text-invite-code">
                    {membership?.organisation.inviteCode}
                  </code>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handleCopyCode}
                    data-testid="button-copy-code"
                  >
                    {copiedCode ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handleRegenerateCode}
                    disabled={isRegeneratingCode}
                    data-testid="button-regenerate-code"
                  >
                    <RefreshCw className={`h-4 w-4 ${isRegeneratingCode ? "animate-spin" : ""}`} />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Share this code with colleagues so they can join your school
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members
              </CardTitle>
              <CardDescription>
                {members?.length || 0} member{(members?.length || 0) !== 1 ? "s" : ""} in your school
              </CardDescription>
            </CardHeader>
            <CardContent>
              {membersLoading ? (
                <LoadingPage />
              ) : members?.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No members yet</p>
              ) : (
                <div className="space-y-3">
                  {members?.map((member) => (
                    <div 
                      key={member.id} 
                      className="flex items-center justify-between gap-4 p-3 border rounded-md"
                      data-testid={`member-row-${member.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {member.userId === membership?.userId ? "You" : `User ${member.userId.slice(0, 8)}...`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Joined {new Date(member.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {member.userId === membership?.userId ? (
                          <Badge variant="secondary">Admin (You)</Badge>
                        ) : (
                          <>
                            <Select
                              value={member.role}
                              onValueChange={(role) => 
                                updateRoleMutation.mutate({ memberId: member.id, role })
                              }
                              disabled={updateRoleMutation.isPending}
                            >
                              <SelectTrigger className="w-24" data-testid={`select-role-${member.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="staff">Staff</SelectItem>
                              </SelectContent>
                            </Select>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  data-testid={`button-remove-${member.id}`}
                                >
                                  <UserMinus className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove Member</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to remove this member from your school? 
                                    They will lose access to all student data.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => removeMemberMutation.mutate(member.id)}
                                  >
                                    Remove
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Data Management
              </CardTitle>
              <CardDescription>
                Manage learning outcomes and curriculum data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border rounded-md">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">L2LP Learning Outcomes</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Reset and import the official NCCA L2LP outcomes dataset (196 outcomes across 5 PLUs)
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="outline"
                      disabled={resetOutcomesMutation.isPending}
                      data-testid="button-reset-outcomes"
                    >
                      {resetOutcomesMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Reset & Import
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset Learning Outcomes?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will delete all existing L2LP outcomes and import the official NCCA dataset with 196 outcomes. 
                        Existing evidence links to outcomes will be preserved if outcome codes match.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => resetOutcomesMutation.mutate()}
                        data-testid="button-confirm-reset-outcomes"
                      >
                        Reset & Import
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </main>

        <MobileNav />
      </div>
    </div>
  );
}
