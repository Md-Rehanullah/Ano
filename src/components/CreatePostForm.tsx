import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PlusCircle, Upload, X, Loader2, Video, ShieldAlert, BarChart3, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { checkLinkSafety, labelFor } from "@/lib/linkSafety";
import RichTextEditor from "@/components/RichTextEditor";

export interface CreatePostPayload {
  title: string;
  description: string;
  category: string;
  imageUrl?: string;
  videoUrl?: string;
  poll?: { question: string; options: string[] };
}

interface CreatePostFormProps {
  onCreatePost: (post: CreatePostPayload) => void;
}

const categories = ["General", "Technology", "Education", "Lifestyle", "Other"];
const DRAFT_KEY = "bridge:post-draft";

interface Draft {
  title: string;
  description: string;
  category: string;
  imageUrl: string;
  videoUrl: string;
  pollEnabled: boolean;
  pollQuestion: string;
  pollOptions: string[];
}

const emptyDraft: Draft = {
  title: "", description: "", category: "General",
  imageUrl: "", videoUrl: "",
  pollEnabled: false, pollQuestion: "", pollOptions: ["", ""],
};

const CreatePostForm = ({ onCreatePost }: CreatePostFormProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [hasDraft, setHasDraft] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();
  const saveTimer = useRef<number | null>(null);

  // Load draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Draft;
        if (parsed.title || parsed.description) {
          setDraft({ ...emptyDraft, ...parsed });
          setHasDraft(true);
        }
      }
    } catch {}
  }, []);

  // Auto-save with debounce
  useEffect(() => {
    if (!isOpen) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      const isEmpty = !draft.title && !draft.description && !draft.imageUrl && !draft.videoUrl;
      if (isEmpty) localStorage.removeItem(DRAFT_KEY);
      else localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }, 600);
    return () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); };
  }, [draft, isOpen]);

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft(prev => ({ ...prev, [key]: value }));

  const clearDraft = () => {
    setDraft(emptyDraft);
    localStorage.removeItem(DRAFT_KEY);
    setHasDraft(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast({ title: "Invalid file type", description: "Please upload an image file.", variant: "destructive" }); return; }
    if (file.size > 5 * 1024 * 1024) { toast({ title: "File too large", description: "Max 5MB.", variant: "destructive" }); return; }
    setIsUploading(true);
    try {
      const filePath = `${Math.random()}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('post-images').upload(filePath, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(filePath);
      update("imageUrl", publicUrl);
      toast({ title: "Image uploaded!" });
    } catch { toast({ title: "Upload failed", variant: "destructive" }); }
    finally { setIsUploading(false); }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) { toast({ title: "Invalid file type", description: "Please upload a video.", variant: "destructive" }); return; }
    if (file.size > 50 * 1024 * 1024) { toast({ title: "File too large", description: "Max 50MB.", variant: "destructive" }); return; }
    setIsUploadingVideo(true);
    try {
      const filePath = `videos/${Math.random()}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('post-images').upload(filePath, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(filePath);
      update("videoUrl", publicUrl);
      toast({ title: "Video uploaded!" });
    } catch { toast({ title: "Upload failed", variant: "destructive" }); }
    finally { setIsUploadingVideo(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.title.trim() || !draft.description.trim()) { toast({ title: "Missing information", variant: "destructive" }); return; }

    // Validate poll if enabled
    let pollPayload: { question: string; options: string[] } | undefined;
    if (draft.pollEnabled) {
      const opts = draft.pollOptions.map(o => o.trim()).filter(Boolean);
      if (!draft.pollQuestion.trim() || opts.length < 2) {
        toast({ title: "Poll needs a question + 2 options", variant: "destructive" });
        return;
      }
      pollPayload = { question: draft.pollQuestion.trim(), options: opts };
    }

    setIsChecking(true);
    try {
      const result = await checkLinkSafety(`${draft.title}\n${draft.description}`);
      const blocked = result.issues.filter(i => i.severity === "block");
      if (blocked.length > 0) {
        toast({ title: "Unsafe link detected", description: `${labelFor(blocked[0].reason)}: ${blocked[0].url}.`, variant: "destructive" });
        setIsChecking(false);
        return;
      }
      const warns = result.issues.filter(i => i.severity === "warn");
      if (warns.length > 0) toast({ title: "Heads up", description: `${labelFor(warns[0].reason)}: ${warns[0].url}` });
    } finally { setIsChecking(false); }

    onCreatePost({
      title: draft.title.trim(),
      description: draft.description.trim(),
      category: draft.category,
      imageUrl: draft.imageUrl.trim() || undefined,
      videoUrl: draft.videoUrl.trim() || undefined,
      poll: pollPayload,
    });
    clearDraft();
    setIsOpen(false);
    toast({ title: "Post created!" });
  };

  if (!isOpen) {
    return (
      <Card className="p-6 mb-6 shadow-card hover:shadow-elegant transition-all duration-300 cursor-pointer" onClick={() => setIsOpen(true)}>
        <div className="flex items-center justify-center space-x-2 text-muted-foreground hover:text-primary transition-colors">
          <PlusCircle className="h-5 w-5" />
          <span className="font-medium">{hasDraft ? "Continue your draft…" : "Write Content / Ask Question"}</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 mb-6 shadow-elegant">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Create New Post</h2>
        <div className="flex items-center gap-2">
          {hasDraft && (
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={clearDraft}>
              <Trash2 className="h-3 w-3 mr-1" /> Clear draft
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="h-8 w-8 p-0"><X className="h-4 w-4" /></Button>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title/Heading *</Label>
          <Input id="title" placeholder="Enter your question or content title..." value={draft.title} onChange={(e) => update("title", e.target.value)} maxLength={200} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description/Question *</Label>
          <RichTextEditor
            id="description"
            value={draft.description}
            onChange={(v) => update("description", v)}
            placeholder="Provide more details... Markdown is supported."
            minHeight="160px"
            maxLength={10000}
          />
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={draft.category} onValueChange={(v) => update("category", v)}>
            <SelectTrigger><SelectValue placeholder="General" /></SelectTrigger>
            <SelectContent>{categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Image (Optional)</Label>
          <div className="flex space-x-2">
            <Input placeholder="Paste image URL or upload..." value={draft.imageUrl} onChange={(e) => update("imageUrl", e.target.value)} disabled={isUploading} />
            <Button type="button" variant="outline" size="sm" className="px-3" disabled={isUploading} onClick={() => document.getElementById('file-upload')?.click()}>
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            </Button>
            <input id="file-upload" type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
          </div>
          {draft.imageUrl && (
            <div className="mt-2 relative">
              <img src={draft.imageUrl} alt="Preview" className="max-w-full h-32 object-cover rounded-lg" onError={() => { toast({ title: "Invalid image", variant: "destructive" }); update("imageUrl", ""); }} />
              <Button type="button" variant="destructive" size="sm" className="absolute top-2 right-2" onClick={() => update("imageUrl", "")}><X className="h-3 w-3" /></Button>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label>Video (Optional)</Label>
          <div className="flex space-x-2">
            <Input placeholder="Paste video URL or upload..." value={draft.videoUrl} onChange={(e) => update("videoUrl", e.target.value)} disabled={isUploadingVideo} />
            <Button type="button" variant="outline" size="sm" className="px-3" disabled={isUploadingVideo} onClick={() => document.getElementById('video-upload')?.click()}>
              {isUploadingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
            </Button>
            <input id="video-upload" type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
          </div>
          {draft.videoUrl && (
            <div className="mt-2 relative">
              <video src={draft.videoUrl} className="max-w-full h-32 rounded-lg" controls />
              <Button type="button" variant="destructive" size="sm" className="absolute top-2 right-2" onClick={() => update("videoUrl", "")}><X className="h-3 w-3" /></Button>
            </div>
          )}
        </div>

        {/* Poll attachment */}
        <div className="space-y-2 border-t pt-4">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Attach a poll (optional)
            </Label>
            <Switch checked={draft.pollEnabled} onCheckedChange={(v) => update("pollEnabled", v)} />
          </div>
          {draft.pollEnabled && (
            <div className="space-y-2 pl-1">
              <Input
                placeholder="Poll question..."
                value={draft.pollQuestion}
                onChange={(e) => update("pollQuestion", e.target.value)}
                maxLength={200}
              />
              {draft.pollOptions.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder={`Option ${i + 1}`}
                    value={opt}
                    onChange={(e) => {
                      const next = [...draft.pollOptions];
                      next[i] = e.target.value;
                      update("pollOptions", next);
                    }}
                    maxLength={100}
                  />
                  {draft.pollOptions.length > 2 && (
                    <Button type="button" variant="ghost" size="sm" className="px-2"
                      onClick={() => update("pollOptions", draft.pollOptions.filter((_, j) => j !== i))}>
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
              {draft.pollOptions.length < 6 && (
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs"
                  onClick={() => update("pollOptions", [...draft.pollOptions, ""])}>
                  <Plus className="h-3 w-3 mr-1" /> Add option
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="flex space-x-3 pt-4">
          <Button type="submit" className="flex-1" disabled={isChecking}>
            {isChecking ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Checking links...</>) : "Post Question/Content"}
          </Button>
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Save & Close</Button>
        </div>
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <ShieldAlert className="h-3 w-3" /> Drafts auto-save locally. Links are scanned before publishing.
        </p>
      </form>
    </Card>
  );
};

export default CreatePostForm;
