import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Users, Copy, RefreshCw, Shield, UserMinus, Check, Database, BookOpen, Palette, Upload, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { MobileHeader } from "@/components/MobileHeader";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { MobileNav } from "@/components/MobileNav";
import { LoadingPage, LoadingSpinner } from "@/components/LoadingSpinner";
import { useOrganisation } from "@/hooks/use-organisation";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface OrganisationMember {
  id: string;
  userId: string;
  role: "admin" | "staff";
  joinedAt: string;
}

const PRESET_COLORS = [
  { name: "Blue", value: "#2563eb" },
  { name: "Green", value: "#16a34a" },
  { name: "Purple", value: "#9333ea" },
  { name: "Orange", value: "#ea580c" },
  { name: "Red", value: "#dc2626" },
  { name: "Teal", value: "#0d9488" },
  { name: "Pink", value: "#db2777" },
  { name: "Indigo", value: "#4f46e5" },
];

export default function OrganisationAdmin() {
  const { membership, isAdmin, regenerateCode, isRegeneratingCode } = useOrganisation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [copiedCode, setCopiedCode] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [accentColor, setAccentColor] = useState("");
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: members, isLoading: membersLoading } = useQuery<OrganisationMember[]>({
    queryKey: ["/api/organisation/members"],
    enabled: isAdmin,
  });

  const { data: logoData } = useQuery<{ signedUrl: string }>({
    queryKey: ["/api/organisation/logo-url"],
    enabled: !!membership?.organisation.logoStoragePath,
  });

  const updateBrandingMutation = useMutation({
    mutationFn: async (data: { displayName?: string | null; accentColor?: string | null; logoStoragePath?: string | null }) => {
      return apiRequest("PATCH", "/api/organisation/branding", data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/organisation"] });
      qc.invalidateQueries({ queryKey: ["/api/me/organisation"] });
      toast({ title: "Branding updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update branding", variant: "destructive" });
    },
  });

  const handleSaveDisplayName = () => {
    if (displayName.trim()) {
      updateBrandingMutation.mutate({ displayName: displayName.trim() });
    }
  };

  const handleColorSelect = (color: string) => {
    setAccentColor(color);
    updateBrandingMutation.mutate({ accentColor: color });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image must be less than 5MB", variant: "destructive" });
      return;
    }

    setIsUploadingLogo(true);
    try {
      const response = await fetch("/api/organisation/logo-upload-url");
      if (!response.ok) throw new Error("Failed to get upload URL");
      const { uploadUrl } = await response.json();

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!uploadResponse.ok) throw new Error("Upload failed");

      const url = new URL(uploadUrl);
      const storagePath = url.pathname;
      
      await updateBrandingMutation.mutateAsync({ logoStoragePath: storagePath });
      qc.invalidateQueries({ queryKey: ["/api/organisation/logo-url"] });
      toast({ title: "Logo uploaded successfully" });
    } catch (error) {
      console.error("Logo upload error:", error);
      toast({ title: "Failed to upload logo", variant: "destructive" });
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      return apiRequest("PATCH", `/api/organisation/members/${memberId}`, { role });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/organisation/members"] });
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
      qc.invalidateQueries({ queryKey: ["/api/organisation/members"] });
      toast({ title: "Member removed" });
    },
    onError: () => {
      toast({ title: "Failed to remove member", variant: "destructive" });
    },
  });

  const resetOutcomesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/reset-outcomes");
      return res.json();
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["/api/outcomes"] });
      qc.invalidateQueries({ queryKey: ["/api/programmes"] });
      const programmeTotals = data.programmeTotals || {};
      const programmeList = Object.entries(programmeTotals)
        .map(([prog, count]) => `${prog}: ${count}`)
        .join(", ");
      toast({ 
        title: "All Programme Outcomes Imported",
        description: `${data.imported} total outcomes imported. ${programmeList}`,
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
                <Palette className="h-5 w-5" />
                School Branding
              </CardTitle>
              <CardDescription>
                Customise how your school appears in the app
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <div className="flex gap-2">
                  <Input
                    id="displayName"
                    placeholder={membership?.organisation.name || "Enter display name"}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    data-testid="input-display-name"
                  />
                  <Button 
                    onClick={handleSaveDisplayName}
                    disabled={!displayName.trim() || updateBrandingMutation.isPending}
                    data-testid="button-save-display-name"
                  >
                    {updateBrandingMutation.isPending ? <LoadingSpinner className="h-4 w-4" /> : "Save"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {membership?.organisation.displayName 
                    ? `Current: "${membership.organisation.displayName}"` 
                    : "Optional friendly name shown in headers"}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Accent Colour</Label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => handleColorSelect(color.value)}
                      className={`w-8 h-8 rounded-md border-2 transition-all ${
                        (accentColor || membership?.organisation.accentColor) === color.value
                          ? "border-foreground scale-110"
                          : "border-transparent hover:scale-105"
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                      data-testid={`color-${color.value.replace("#", "")}`}
                    />
                  ))}
                </div>
                {membership?.organisation.accentColor && (
                  <p className="text-xs text-muted-foreground">
                    Current: {PRESET_COLORS.find(c => c.value === membership.organisation.accentColor)?.name || membership.organisation.accentColor}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>School Logo</Label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-md border flex items-center justify-center bg-muted overflow-hidden">
                    {logoData?.signedUrl ? (
                      <img 
                        src={logoData.signedUrl} 
                        alt="School logo" 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Image className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      data-testid="input-logo-file"
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingLogo}
                      data-testid="button-upload-logo"
                    >
                      {isUploadingLogo ? (
                        <LoadingSpinner className="h-4 w-4 mr-2" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      {isUploadingLogo ? "Uploading..." : "Upload Logo"}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG or SVG, max 5MB
                    </p>
                  </div>
                </div>
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
                    <span className="font-medium">NCCA Learning Outcomes</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Import the official NCCA outcomes for all programmes: JC L1LP, JC L2LP, SC L1LP, SC L2LP (676+ outcomes)
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
                      Import All Outcomes
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Import All Programme Outcomes?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will clear all existing outcomes and import the official NCCA dataset with 676+ outcomes across all 4 programmes (JC L1LP, JC L2LP, SC L1LP, SC L2LP). 
                        Existing evidence links will be preserved where outcome codes match.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => resetOutcomesMutation.mutate()}
                        data-testid="button-confirm-reset-outcomes"
                      >
                        Import All
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
