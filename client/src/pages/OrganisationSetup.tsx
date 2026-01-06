import { useState } from "react";
import { Building2, Users, ArrowRight, KeyRound, Plus, X, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useOrganisation } from "@/hooks/use-organisation";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function OrganisationSetup() {
  const { user, logout } = useAuth();
  const { createOrg, isCreatingOrg, joinOrg, isJoiningOrg } = useOrganisation();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<string>("create");
  
  const [schoolName, setSchoolName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [domainInput, setDomainInput] = useState("");
  const [allowedDomains, setAllowedDomains] = useState<string[]>([]);
  const [accentColor, setAccentColor] = useState("#3b82f6");
  
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [jobTitle, setJobTitle] = useState("");
  
  const [inviteCode, setInviteCode] = useState("");
  const [joinFirstName, setJoinFirstName] = useState(user?.firstName || "");
  const [joinLastName, setJoinLastName] = useState(user?.lastName || "");
  const [joinJobTitle, setJoinJobTitle] = useState("");

  const handleAddDomain = () => {
    const domain = domainInput.trim().toLowerCase();
    if (domain && !allowedDomains.includes(domain)) {
      if (/^[a-z0-9]+([\-.][a-z0-9]+)*\.[a-z]{2,}$/.test(domain)) {
        setAllowedDomains([...allowedDomains, domain]);
        setDomainInput("");
      } else {
        toast({ title: "Invalid domain format", variant: "destructive" });
      }
    }
  };

  const handleRemoveDomain = (domain: string) => {
    setAllowedDomains(allowedDomains.filter(d => d !== domain));
  };

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName.trim()) {
      toast({ title: "Please enter a school name", variant: "destructive" });
      return;
    }
    if (!rollNumber.trim()) {
      toast({ title: "Please enter the school roll number", variant: "destructive" });
      return;
    }
    if (allowedDomains.length === 0) {
      toast({ title: "Please add at least one allowed email domain", variant: "destructive" });
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      toast({ title: "Please enter your first and last name", variant: "destructive" });
      return;
    }

    try {
      await createOrg({ 
        name: schoolName.trim(),
        rollNumber: rollNumber.trim(),
        allowedDomains,
        accentColor,
        adminFirstName: firstName.trim(),
        adminLastName: lastName.trim(),
        adminJobTitle: jobTitle.trim() || undefined,
      });
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
    if (!joinFirstName.trim() || !joinLastName.trim()) {
      toast({ title: "Please enter your first and last name", variant: "destructive" });
      return;
    }

    try {
      await joinOrg({ 
        inviteCode: inviteCode.trim().toUpperCase(),
        firstName: joinFirstName.trim(),
        lastName: joinLastName.trim(),
        jobTitle: joinJobTitle.trim() || undefined,
      });
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
        <div className="w-full max-w-lg">
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
                    Register Your School
                  </CardTitle>
                  <CardDescription>
                    Set up your school as admin and invite colleagues
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateSchool} className="space-y-5">
                    <div className="space-y-4 pb-4 border-b">
                      <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">School Details</h3>
                      
                      <div className="space-y-2">
                        <Label htmlFor="schoolName">School Name *</Label>
                        <Input
                          id="schoolName"
                          placeholder="e.g., St. Mary's Secondary School"
                          value={schoolName}
                          onChange={(e) => setSchoolName(e.target.value)}
                          disabled={isCreatingOrg}
                          data-testid="input-school-name"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="rollNumber">School Roll Number *</Label>
                        <Input
                          id="rollNumber"
                          placeholder="e.g., 68072B"
                          value={rollNumber}
                          onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                          disabled={isCreatingOrg}
                          data-testid="input-roll-number"
                        />
                        <p className="text-xs text-muted-foreground">
                          Your official Department of Education roll number
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="allowedDomains">Allowed Email Domains *</Label>
                        <div className="flex gap-2">
                          <Input
                            id="allowedDomains"
                            placeholder="e.g., kwetb.ie"
                            value={domainInput}
                            onChange={(e) => setDomainInput(e.target.value.toLowerCase())}
                            disabled={isCreatingOrg}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddDomain();
                              }
                            }}
                            data-testid="input-domain"
                          />
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="icon"
                            onClick={handleAddDomain}
                            disabled={isCreatingOrg}
                            data-testid="button-add-domain"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        {allowedDomains.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {allowedDomains.map((domain) => (
                              <Badge key={domain} variant="secondary" className="flex items-center gap-1">
                                {domain}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDomain(domain)}
                                  className="ml-1 hover:text-destructive"
                                  data-testid={`button-remove-domain-${domain}`}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Staff email domains (e.g., kwetb.ie, school.ie)
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="accentColor">School Accent Color</Label>
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-md border"
                            style={{ backgroundColor: accentColor }}
                          />
                          <Input
                            id="accentColor"
                            type="color"
                            value={accentColor}
                            onChange={(e) => setAccentColor(e.target.value)}
                            disabled={isCreatingOrg}
                            className="w-20 p-1 h-10"
                            data-testid="input-accent-color"
                          />
                          <Palette className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Your Profile</h3>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name *</Label>
                          <Input
                            id="firstName"
                            placeholder="First name"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            disabled={isCreatingOrg}
                            data-testid="input-first-name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name *</Label>
                          <Input
                            id="lastName"
                            placeholder="Last name"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            disabled={isCreatingOrg}
                            data-testid="input-last-name"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="jobTitle">Job Title</Label>
                        <Input
                          id="jobTitle"
                          placeholder="e.g., SEN Coordinator"
                          value={jobTitle}
                          onChange={(e) => setJobTitle(e.target.value)}
                          disabled={isCreatingOrg}
                          data-testid="input-job-title"
                        />
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isCreatingOrg}
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
                  <form onSubmit={handleJoinSchool} className="space-y-5">
                    <div className="space-y-4 pb-4 border-b">
                      <div className="space-y-2">
                        <Label htmlFor="inviteCode">Invite Code *</Label>
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
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Your Profile</h3>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="joinFirstName">First Name *</Label>
                          <Input
                            id="joinFirstName"
                            placeholder="First name"
                            value={joinFirstName}
                            onChange={(e) => setJoinFirstName(e.target.value)}
                            disabled={isJoiningOrg}
                            data-testid="input-join-first-name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="joinLastName">Last Name *</Label>
                          <Input
                            id="joinLastName"
                            placeholder="Last name"
                            value={joinLastName}
                            onChange={(e) => setJoinLastName(e.target.value)}
                            disabled={isJoiningOrg}
                            data-testid="input-join-last-name"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="joinJobTitle">Job Title</Label>
                        <Input
                          id="joinJobTitle"
                          placeholder="e.g., SEN Teacher"
                          value={joinJobTitle}
                          onChange={(e) => setJoinJobTitle(e.target.value)}
                          disabled={isJoiningOrg}
                          data-testid="input-join-job-title"
                        />
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isJoiningOrg}
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
