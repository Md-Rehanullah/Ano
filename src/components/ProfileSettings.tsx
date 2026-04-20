import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, User, Loader2, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ProfileSettingsProps {
  userId: string;
  email?: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  onUpdate: () => void;
}

const BIO_MAX = 300;

const ProfileSettings = ({ userId, email, displayName, avatarUrl, bio, onUpdate }: ProfileSettingsProps) => {
  const [name, setName] = useState(displayName || "");
  const [bioText, setBioText] = useState(bio || "");
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(avatarUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file type", description: "Please upload an image file.", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please upload an image smaller than 2MB.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const localPreview = URL.createObjectURL(file);
      setPreviewUrl(localPreview);

      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(fileName);
      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .upsert({ user_id: userId, avatar_url: urlWithCacheBust }, { onConflict: "user_id" });
      if (updateError) throw updateError;

      setPreviewUrl(urlWithCacheBust);
      onUpdate();
      toast({ title: "Avatar updated" });
    } catch (error) {
      console.error("Avatar upload error", error);
      setPreviewUrl(avatarUrl);
      toast({ title: "Upload failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveName = async () => {
    if (!name.trim()) return;
    setIsSavingName(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({ display_name: name.trim() })
        .eq("user_id", userId)
        .select();
      if (error) throw error;
      if (!data || data.length === 0) {
        const { error: upsertError } = await supabase
          .from("profiles")
          .upsert({ user_id: userId, display_name: name.trim() }, { onConflict: "user_id" });
        if (upsertError) throw upsertError;
      }
      onUpdate();
      toast({ title: "Display name updated" });
    } catch (error) {
      console.error("Name update error", error);
      toast({ title: "Error", description: "Failed to update name.", variant: "destructive" });
    } finally {
      setIsSavingName(false);
    }
  };

  const handleSaveBio = async () => {
    setIsSavingBio(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({ bio: bioText.trim() })
        .eq("user_id", userId)
        .select();
      if (error) throw error;
      if (!data || data.length === 0) {
        const { error: upsertError } = await supabase
          .from("profiles")
          .upsert({ user_id: userId, bio: bioText.trim() }, { onConflict: "user_id" });
        if (upsertError) throw upsertError;
      }
      onUpdate();
      toast({ title: "Bio updated" });
    } catch (error) {
      console.error("Bio update error", error);
      toast({ title: "Error", description: "Failed to update bio.", variant: "destructive" });
    } finally {
      setIsSavingBio(false);
    }
  };

  return (
    <Card className="p-6 shadow-card">
      <h2 className="text-lg font-semibold mb-6">Profile Settings</h2>

      <div className="space-y-6">
        {/* Avatar */}
        <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6">
          <div className="relative group">
            <Avatar className="h-24 w-24 border-4 border-primary/20">
              <AvatarImage src={previewUrl || undefined} alt="Profile avatar" />
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-2xl">
                <User className="h-12 w-12" />
              </AvatarFallback>
            </Avatar>
            <button
              onClick={handleAvatarClick}
              disabled={isUploading}
              className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-not-allowed"
            >
              {isUploading ? <Loader2 className="h-6 w-6 text-white animate-spin" /> : <Camera className="h-6 w-6 text-white" />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <p className="text-sm font-medium mb-1">Profile Picture</p>
            <p className="text-xs text-muted-foreground">Click the avatar to upload. Max 2MB.</p>
          </div>
        </div>

        {/* Email (read-only) */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Email Address</Label>
          <Input value={email || ""} readOnly disabled className="bg-muted/40" />
          <p className="text-xs text-muted-foreground">Your email is private — only you can see it.</p>
        </div>

        {/* Display Name */}
        <div className="space-y-2">
          <Label htmlFor="displayName">Display Name</Label>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input id="displayName" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your display name" maxLength={50} className="flex-1" />
            <Button onClick={handleSaveName} disabled={isSavingName || !name.trim() || name.trim() === displayName}>
              {isSavingName ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : "Save"}
            </Button>
          </div>
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={bioText}
            onChange={(e) => setBioText(e.target.value.slice(0, BIO_MAX))}
            placeholder="Tell people a little about yourself..."
            className="resize-none min-h-24"
            maxLength={BIO_MAX}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{bioText.length}/{BIO_MAX}</p>
            <Button size="sm" onClick={handleSaveBio} disabled={isSavingBio || (bioText.trim() === (bio || "").trim())}>
              {isSavingBio ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : "Save Bio"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ProfileSettings;
