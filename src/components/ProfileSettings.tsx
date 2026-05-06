import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, User, Loader2, Mail, Trash2, AlertTriangle, MapPin, Twitter, Instagram, Facebook, Image as ImageIcon, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ProfileSettingsProps {
  userId: string;
  email?: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bannerUrl?: string | null;
  bio: string | null;
  location?: string | null;
  xUrl?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  onUpdate: () => void;
}

const BIO_MAX = 300;

// CSS gradient presets that map 1:1 to a `background-image` value stored in `banner_url`.
const PRESET_BANNERS: { id: string; label: string; value: string }[] = [
  { id: "teal",   label: "Teal Dream",     value: "linear-gradient(135deg,#0ea5c5 0%,#22d3ee 100%)" },
  { id: "sunset", label: "Sunset",         value: "linear-gradient(135deg,#f97316 0%,#ec4899 100%)" },
  { id: "forest", label: "Forest",         value: "linear-gradient(135deg,#059669 0%,#84cc16 100%)" },
  { id: "midnight", label: "Midnight",     value: "linear-gradient(135deg,#1e293b 0%,#6366f1 100%)" },
  { id: "rose",   label: "Rose",           value: "linear-gradient(135deg,#be185d 0%,#fb7185 100%)" },
  { id: "amber",  label: "Amber",          value: "linear-gradient(135deg,#b45309 0%,#fbbf24 100%)" },
];

const isPresetGradient = (v: string | null | undefined) => !!v && v.startsWith("linear-gradient");

const ProfileSettings = ({ userId, email, displayName, avatarUrl, bannerUrl, bio, location, xUrl, instagramUrl, facebookUrl, onUpdate }: ProfileSettingsProps) => {
  const [name, setName] = useState(displayName || "");
  const [bioText, setBioText] = useState(bio || "");
  const [city, setCity] = useState(location || "");
  const [x, setX] = useState(xUrl || "");
  const [ig, setIg] = useState(instagramUrl || "");
  const [fb, setFb] = useState(facebookUrl || "");
  const [isSavingExtras, setIsSavingExtras] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isSavingBanner, setIsSavingBanner] = useState(false);
  const [bannerPreview, setBannerPreview] = useState<string | null>(bannerUrl || null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(avatarUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Not signed in");
      const { data, error } = await supabase.functions.invoke("delete-account", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      await supabase.auth.signOut();
      toast({ title: "Account deleted", description: "Your account and data were removed." });
      navigate("/");
    } catch (e: any) {
      toast({ title: "Could not delete account", description: e.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

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

  const handleSaveExtras = async () => {
    setIsSavingExtras(true);
    try {
      const sanitize = (v: string) => {
        const t = v.trim();
        return t.length ? t.slice(0, 200) : null;
      };
      const payload = {
        user_id: userId,
        location: sanitize(city),
        x_url: sanitize(x),
        instagram_url: sanitize(ig),
        facebook_url: sanitize(fb),
      };
      const { error } = await supabase
        .from("profiles")
        .upsert(payload, { onConflict: "user_id" });
      if (error) throw error;
      onUpdate();
      toast({ title: "Profile details saved" });
    } catch (e) {
      console.error("Extras save error", e);
      toast({ title: "Error", description: "Failed to save details.", variant: "destructive" });
    } finally {
      setIsSavingExtras(false);
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

        {/* Location */}
        <div className="space-y-2">
          <Label htmlFor="location" className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Location <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
          <Input
            id="location"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Mumbai, India"
            maxLength={120}
          />
          <p className="text-xs text-muted-foreground">Shown publicly on your profile. Leave empty to hide.</p>
        </div>

        {/* Social Links */}
        <div className="space-y-3">
          <Label>Social Links <span className="text-xs text-muted-foreground font-normal">(public, optional)</span></Label>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Twitter className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input value={x} onChange={(e) => setX(e.target.value)} placeholder="https://x.com/yourhandle" />
            </div>
            <div className="flex items-center gap-2">
              <Instagram className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input value={ig} onChange={(e) => setIg(e.target.value)} placeholder="https://instagram.com/yourhandle" />
            </div>
            <div className="flex items-center gap-2">
              <Facebook className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input value={fb} onChange={(e) => setFb(e.target.value)} placeholder="https://facebook.com/yourhandle" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSaveExtras} disabled={isSavingExtras}>
              {isSavingExtras ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : "Save details"}
            </Button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="pt-6 mt-2 border-t">
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-destructive">Delete account</p>
                <p className="text-xs text-muted-foreground">
                  Permanently remove your account, posts, comments, bookmarks and profile. This cannot be undone.
                </p>
              </div>
            </div>
            <AlertDialog onOpenChange={(o) => { if (!o) setConfirmText(""); }}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="w-full sm:w-auto">
                  <Trash2 className="h-4 w-4 mr-2" /> Delete my account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete your account and all of your content. Type{" "}
                    <span className="font-mono font-semibold text-destructive">DELETE</span> to confirm.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder='Type "DELETE" to confirm'
                  autoFocus
                />
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => { e.preventDefault(); handleDeleteAccount(); }}
                    disabled={isDeleting || confirmText !== "DELETE"}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting...</> : "Delete forever"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ProfileSettings;
