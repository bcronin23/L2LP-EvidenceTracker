import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Users, Copy, RefreshCw, Shield, UserMinus, Check, Database, BookOpen, Palette, Upload, Image, AlertTriangle, CheckCircle, FolderOpen, Link2, ExternalLink, Loader2 } from "lucide-react";
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

interface OutcomesQAData {
  totalOutcomes: number;
  programmeTotals: Record<string, number>;
  moduleTotals: Record<string, Record<string, number>>;
  anomalies: { type: string; message: string; severity: string }[];
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
  const [driveFolderInput, setDriveFolderInput] = useState("");
  const [isTestingDrive, setIsTestingDrive] = useState(false);

  const { data: members, isLoading: membersLoading } = useQuery<OrganisationMember[]>({
    queryKey: ["/api/organisation/members"],
    enabled: isAdmin,
  });

  const { data: outcomesQA, isLoading: qaLoading } = useQuery<OutcomesQAData>({
    queryKey: ["/api/admin/outcomes-qa"],
    enabled: isAdmin,
  });

  const { data: logoData } = useQuery<{ signedUrl: string }>({
    queryKey: ["/api/organisation/logo-url"],
    enabled: !!membership?.organisation.logoStoragePath,
  });

  interface DriveStatus {
    connected: boolean;
    configured: boolean;
    sharedDriveRootFolderId: string | null;
    sharedDriveName: string | null;
    driveConnectedAt: string | null;
  }

  const { data: driveStatus, isLoading: driveStatusLoading } = useQuery<DriveStatus>({
    queryKey: ["/api/organisation/drive/status"],
    enabled: isAdmin,
  });

  const configureDriveMutation = useMutation({
    mutationFn: async (folderId: string) => {
      return apiRequest("PATCH", "/api/organisation/drive/config", { sharedDriveRootFolderId: folderId });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/organisation/drive/status"] });
      qc.invalidateQueries({ queryKey: ["/api/me/organisation"] });
      toast({ title: "Google Drive connected successfully" });
      setDriveFolderInput("");
    },
    onError: (error: any) => {
      toast({ title: error.message || "Failed to connect Google Drive", variant: "destructive" });
    },
  });

  const disconnectDriveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", "/api/organisation/drive/config");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/organisation/drive/status"] });
      qc.invalidateQueries({ queryKey: ["/api/me/organisation"] });
      toast({ title: "Google Drive disconnected" });
    },
    onError: () => {
      toast({ title: "Failed to disconnect Google Drive", variant: "destructive" });
    },
  });

  const extractFolderId = (input: string): string => {
    const trimmed = input.trim();
    const folderMatch = trimmed.match(/folders\/([a-zA-Z0-9_-]+)/);
    if (folderMatch) return folderMatch[1];
    const idMatch = trimmed.match(/id=([a-zA-Z0-9_-]+)/);
    if (idMatch) return idMatch[1];
    if (/^[a-zA-Z0-9_-]+$/.test(trimmed)) return trimmed;
    return trimmed;
  };

  const handleConnectDrive = async () => {
    if (!driveFolderInput.trim()) {
      toast({ title: "Please enter a folder URL or ID", variant: "destructive" });
      return;
    }
    const folderId = extractFolderId(driveFolderInput);
    setIsTestingDrive(true);
    try {
      const testRes = await fetch("/api/organisation/drive/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId }),
        credentials: "include",
      });
      const testData = await testRes.json();
      if (!testData.success) {
        toast({ title: testData.error || "Cannot access folder", variant: "destructive" });
        return;
      }
      configureDriveMutation.mutate(folderId);
    } catch (error) {
      toast({ title: "Failed to test folder access", variant: "destructive" });
    } finally {
      setIsTestingDrive(false);
    }
  };

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
      qc.invalidateQueries({ queryKey: ["/api/admin/outcomes-qa"] });
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
                <FolderOpen className="h-5 w-5" />
                Google Shared Drive
              </CardTitle>
              <CardDescription>
                Connect your school's Google Shared Drive to store evidence files directly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {driveStatusLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking Drive connection...
                </div>
              ) : driveStatus?.configured ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 rounded-md bg-accent/10 border border-accent/20">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div className="flex-1">
                      <p className="font-medium">Connected to Shared Drive</p>
                      <p className="text-sm text-muted-foreground">
                        {driveStatus.sharedDriveName || "Folder connected"}
                      </p>
                      {driveStatus.driveConnectedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Connected on {new Date(driveStatus.driveConnectedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      data-testid="button-open-drive-folder"
                    >
                      <a 
                        href={`https://drive.google.com/drive/folders/${driveStatus.sharedDriveRootFolderId}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Open
                      </a>
                    </Button>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" data-testid="button-disconnect-drive">
                        Disconnect Drive
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Disconnect Google Drive?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove the Drive connection. Existing evidence files will remain in Google Drive, but new uploads won't be possible.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => disconnectDriveMutation.mutate()}
                          disabled={disconnectDriveMutation.isPending}
                        >
                          Disconnect
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 rounded-md bg-muted">
                    <Link2 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Not connected</p>
                      <p className="text-sm text-muted-foreground">
                        Link your school's Google Shared Drive folder to enable direct file uploads
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="driveFolderInput">Shared Drive Folder URL or ID</Label>
                    <div className="flex gap-2">
                      <Input
                        id="driveFolderInput"
                        placeholder="Paste folder URL or ID from Google Drive..."
                        value={driveFolderInput}
                        onChange={(e) => setDriveFolderInput(e.target.value)}
                        data-testid="input-drive-folder"
                      />
                      <Button 
                        onClick={handleConnectDrive}
                        disabled={!driveFolderInput.trim() || isTestingDrive || configureDriveMutation.isPending}
                        data-testid="button-connect-drive"
                      >
                        {(isTestingDrive || configureDriveMutation.isPending) ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Connect
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Open your Shared Drive folder in Google Drive and copy the URL from your browser, then paste it here
                    </p>
                  </div>
                </div>
              )}
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

              {/* Outcomes QA Section */}
              {qaLoading ? (
                <div className="flex items-center justify-center p-4">
                  <LoadingSpinner />
                </div>
              ) : outcomesQA && (
                <div className="space-y-4 mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Outcomes Quality Check</span>
                    {outcomesQA.anomalies.length === 0 ? (
                      <Badge variant="outline" className="ml-2 gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        All checks passed
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="ml-2 gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {outcomesQA.anomalies.length} issue{outcomesQA.anomalies.length > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                    {Object.entries(outcomesQA.programmeTotals).sort().map(([prog, count]) => (
                      <div key={prog} className="p-2 border rounded-md">
                        <div className="font-medium">{prog.replace("_", " ")}</div>
                        <div className="text-muted-foreground">{count} outcomes</div>
                      </div>
                    ))}
                  </div>

                  {outcomesQA.anomalies.length > 0 && (
                    <div className="space-y-2">
                      {outcomesQA.anomalies.map((anomaly, idx) => (
                        <div 
                          key={idx}
                          className={`p-2 rounded-md text-sm flex items-center gap-2 ${
                            anomaly.severity === "error" 
                              ? "bg-destructive/10 text-destructive" 
                              : "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                          }`}
                        >
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          {anomaly.message}
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Total: {outcomesQA.totalOutcomes} outcomes across {Object.keys(outcomesQA.programmeTotals).length} programmes
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-data-protection">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Data Protection Guidance
              </CardTitle>
              <CardDescription>
                Key practices for GDPR-compliant evidence collection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm">
                <div className="p-3 border rounded-md space-y-1">
                  <p className="font-medium">Student Identifiers</p>
                  <p className="text-muted-foreground">
                    Students are identified by initials only (2-4 uppercase letters). Never use full names, PPS numbers, or other personal identifiers in this system.
                  </p>
                </div>
                <div className="p-3 border rounded-md space-y-1">
                  <p className="font-medium">Evidence Notes</p>
                  <p className="text-muted-foreground">
                    Observations and notes should describe learning behaviours, not identify students. Avoid writing full names, addresses, medical details, or family information in any text field.
                  </p>
                </div>
                <div className="p-3 border rounded-md space-y-1">
                  <p className="font-medium">Photos and Videos</p>
                  <p className="text-muted-foreground">
                    Ensure your school's media consent policy covers any photos or videos stored in Google Drive. Files remain in your school's Shared Drive and are not stored by this application.
                  </p>
                </div>
                <div className="p-3 border rounded-md space-y-1">
                  <p className="font-medium">Google Drive Organisation</p>
                  <p className="text-muted-foreground">
                    Uploaded files are automatically organised into folders by student initials and learning outcome codes. This keeps evidence tidy and easy to locate during moderation.
                  </p>
                </div>
                <div className="p-3 border rounded-md space-y-1">
                  <p className="font-medium">Data Retention</p>
                  <p className="text-muted-foreground">
                    Archive students who have completed their programme. Archived students can be restored if needed. Consult your school's data retention policy for guidance on when to permanently delete records.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>

        <MobileNav />
      </div>
    </div>
  );
}
