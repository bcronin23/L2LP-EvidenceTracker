import { useState } from "react";
import { Building2, Users, ArrowRight, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useOrganisation } from "@/hooks/use-organisation";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function OrganisationSetup() {
  const { user, logout } = useAuth();
  const { createOrg, isCreatingOrg, joinOrg, isJoiningOrg } = useOrganisation();
  const { toast } = useToast();
  
  const [schoolName, setSchoolName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [activeTab, setActiveTab] = useState<string>("create");

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName.trim()) {
      toast({ title: "Please enter a school name", variant: "destructive" });
      return;
    }

    try {
      await createOrg({ name: schoolName.trim() });
      toast({ title: "School created successfully" });
    } catch (error: any) {
      const message = error?.message?.includes(":") 
        ? error.message.split(":").slice(1).join(":").trim()
        : "Failed to create school";
      toast({ title: message, variant: "destructive" });
    }
  };

  const handleJoinSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      toast({ title: "Please enter an invite code", variant: "destructive" });
      return;
    }

    try {
      await joinOrg({ inviteCode: inviteCode.trim().toUpperCase() });
      toast({ title: "Joined school successfully" });
    } catch (error: any) {
      const message = error?.message?.includes(":") 
        ? error.message.split(":").slice(1).join(":").trim()
        : "Failed to join school";
      toast({ title: message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          <span className="font-semibold text-lg">L2LP Evidence Tracker</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" onClick={() => logout()} data-testid="button-logout">
            Sign Out
          </Button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">Welcome, {user?.firstName || "there"}</h1>
            <p className="text-muted-foreground">
              To get started, create a new school or join an existing one
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create" data-testid="tab-create-school">
                Create School
              </TabsTrigger>
              <TabsTrigger value="join" data-testid="tab-join-school">
                Join School
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Create a New School
                  </CardTitle>
                  <CardDescription>
                    Set up your school and invite colleagues to join with an invite code
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateSchool} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="schoolName">School Name</Label>
                      <Input
                        id="schoolName"
                        placeholder="e.g., St. Mary's Secondary School"
                        value={schoolName}
                        onChange={(e) => setSchoolName(e.target.value)}
                        disabled={isCreatingOrg}
                        data-testid="input-school-name"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isCreatingOrg || !schoolName.trim()}
                      data-testid="button-create-school"
                    >
                      {isCreatingOrg ? (
                        <LoadingSpinner className="h-4 w-4" />
                      ) : (
                        <>
                          Create School
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="join" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Join Existing School
                  </CardTitle>
                  <CardDescription>
                    Enter the invite code shared by your school administrator
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleJoinSchool} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="inviteCode">Invite Code</Label>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="inviteCode"
                          placeholder="e.g., ABC12345"
                          value={inviteCode}
                          onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                          disabled={isJoiningOrg}
                          className="pl-10 uppercase tracking-widest"
                          maxLength={8}
                          data-testid="input-invite-code"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Ask your school administrator for this 8-character code
                      </p>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isJoiningOrg || !inviteCode.trim()}
                      data-testid="button-join-school"
                    >
                      {isJoiningOrg ? (
                        <LoadingSpinner className="h-4 w-4" />
                      ) : (
                        <>
                          Join School
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
