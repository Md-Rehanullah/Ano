import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PlusCircle, Upload, X, Loader2, Video, ShieldAlert, BarChart3, Plus, Trash2, Paperclip, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { checkLinkSafety, labelFor } from "@/lib/linkSafety";
import { checkProfanity } from "@/lib/profanity";
import RichTextEditor from "@/components/RichTextEditor";

export interface CreatePostPayload {
  title: string;
  description: string;
  category: string;
  imageUrl?: string;
  videoUrl?: string;
  fileUrl?: string;
  fileName?: string;
  poll?: { question: string; options: string[] };
}

interface CreatePostFormProps {
  onCreatePost: (post: CreatePostPayload) => void;
  /** When true, render the expanded form directly (no collapsed prompt). */
  forceOpen?: boolean;
  /** Called when the user clicks Cancel/Close in forceOpen mode. */
  onRequestClose?: () => void;
}

const categories = ["General", "Technology", "Education", "Lifestyle", "Other"];
const DRAFT_KEY = "bridge:post-draft";

interface Draft {
  content: string;
  category: string;
  imageUrl: string;
  videoUrl: string;
  fileUrl: string;
  fileName: string;
  pollEnabled: boolean;
  pollQuestion: string;
  pollOptions: string[];
}

const emptyDraft: Draft = {
  content: "", category: "General",
  imageUrl: "", videoUrl: "", fileUrl: "", fileName: "",
  pollEnabled: false, pollQuestion: "", pollOptions: ["", ""],
};

const CreatePostForm = ({ onCreatePost, forceOpen = false, onRequestClose }: CreatePostFormProps) => {
  const [isOpenState, setIsOpen] = useState(false);
  const isOpen = forceOpen || isOpenState;
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [hasDraft, setHasDraft] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Draft;
        if (parsed.content) {
          setDraft({ ...emptyDraft, ...parsed });
          setHasDraft(true);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      const isEmpty = !draft.content && !draft.imageUrl && !draft.videoUrl && !draft.fileUrl;
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

  const moderateMedia = async (publicUrl: string, filePath: string, kind: "image" | "video") => {
    const { data, error } = await supabase.functions.invoke("moderate-image", {
      body: { mediaUrl: publicUrl, kind },
    });
    if (error) {
      // Fail closed: delete the just-uploaded file
      await supabase.storage.from("post-images").remove([filePath]);
      toast({ title: "Moderation check failed", description: "Please try again.", variant: "destructive" });
      return false;
    }
    if (!data?.allowed) {
      await supabase.storage.from("post-images").remove([filePath]);
      const reason = (data?.reasons ?? []).join(", ") || "unsafe content";
      toast({ title: "Media blocked", description: `Detected: ${reason}.`, variant: "destructive" });
      return false;
    }
    return true;
  };

  const uploadImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast({ title: "Invalid file type", description: "Images and GIFs only.", variant: "destructive" }); return; }
    const isGif = file.type === 'image/gif';
    const imageLimit = isGif ? 15 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > imageLimit) { toast({ title: "File too large", description: isGif ? "Max 15MB for GIFs." : "Max 5MB.", variant: "destructive" }); return; }
    setIsUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) { toast({ title: "Sign in first", variant: "destructive" }); setIsUploading(false); return; }
      const ext = (file.name.split('.').pop() || (isGif ? 'gif' : 'png')).toLowerCase();
      const filePath = `${uid}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('post-images').upload(filePath, file, { contentType: file.type || undefined });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(filePath);
      const ok = await moderateMedia(publicUrl, filePath, "image");
      if (!ok) return;
      update("imageUrl", publicUrl);
      toast({ title: isGif ? "GIF added!" : "Image added!" });
    } catch { toast({ title: "Upload failed", variant: "destructive" }); }
    finally { setIsUploading(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadImageFile(file);
    e.target.value = "";
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) { toast({ title: "Invalid file type", variant: "destructive" }); return; }
    if (file.size > 50 * 1024 * 1024) { toast({ title: "File too large", description: "Max 50MB.", variant: "destructive" }); return; }
    setIsUploadingVideo(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) { toast({ title: "Sign in first", variant: "destructive" }); setIsUploadingVideo(false); return; }
      const filePath = `${uid}/videos/${crypto.randomUUID()}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('post-images').upload(filePath, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(filePath);
      const ok = await moderateMedia(publicUrl, filePath, "video");
      if (!ok) return;
      update("videoUrl", publicUrl);
      toast({ title: "Video uploaded!" });
    } catch { toast({ title: "Upload failed", variant: "destructive" }); }
    finally { setIsUploadingVideo(false); }
  };


  const ALLOWED_DOC_EXT = ["pdf", "xml", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "json", "md", "zip"];

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = (file.name.split('.').pop() || "").toLowerCase();
    if (!ALLOWED_DOC_EXT.includes(ext)) {
      toast({ title: "Unsupported file type", description: `Allowed: ${ALLOWED_DOC_EXT.join(", ")}.`, variant: "destructive" });
      return;
    }
    if (file.size > 20 * 1024 * 1024) { toast({ title: "File too large", description: "Max 20MB.", variant: "destructive" }); return; }
    setIsUploadingFile(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) { toast({ title: "Sign in first", variant: "destructive" }); setIsUploadingFile(false); return; }
      const filePath = `${uid}/files/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('post-images').upload(filePath, file, { contentType: file.type || undefined });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(filePath);
      update("fileUrl", publicUrl);
      update("fileName", file.name);
      toast({ title: "File attached!" });
    } catch { toast({ title: "Upload failed", variant: "destructive" }); }
    finally { setIsUploadingFile(false); }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.content.trim()) { toast({ title: "Write something first", variant: "destructive" }); return; }

    const profanityCheck = checkProfanity(`${draft.content}\n${draft.pollQuestion}\n${draft.pollOptions.join("\n")}`);
    if (!profanityCheck.ok) {
      toast({ title: "Inappropriate language detected", description: `Please remove profane content (matched: "${profanityCheck.match}").`, variant: "destructive" });
      return;
    }

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
      const result = await checkLinkSafety(draft.content);
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
      title: "",
      description: draft.content.trim(),
      category: draft.category,
      imageUrl: draft.imageUrl.trim() || undefined,
      videoUrl: draft.videoUrl.trim() || undefined,
      fileUrl: draft.fileUrl.trim() || undefined,
      fileName: draft.fileName.trim() || undefined,
      poll: pollPayload,
    });
    clearDraft();
    if (!forceOpen) setIsOpen(false);
    onRequestClose?.();
    toast({ title: "Post created!" });
  };

  if (!isOpen) {
    return (
      <Card className="p-6 mb-6 shadow-card hover:shadow-elegant transition-all duration-300 cursor-pointer" onClick={() => setIsOpen(true)}>
        <div className="flex items-center justify-center space-x-2 text-muted-foreground hover:text-primary transition-colors">
          <PlusCircle className="h-5 w-5" />
          <span className="font-medium">{hasDraft ? "Continue your draft…" : "Write a post"}</span>
        </div>
      </Card>
    );
  }

  const handleClose = () => {
    if (forceOpen) onRequestClose?.();
    else setIsOpen(false);
  };

  return (
    <Card className={forceOpen ? "p-0 shadow-none border-0" : "p-6 mb-6 shadow-elegant"}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Write a post</h2>
        <div className="flex items-center gap-2">
          {hasDraft && (
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={clearDraft}>
              <Trash2 className="h-3 w-3 mr-1" /> Clear draft
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={handleClose} className="h-8 w-8 p-0"><X className="h-4 w-4" /></Button>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="post-content">Your post *</Label>
          <RichTextEditor
            id="post-content"
            value={draft.content}
            onChange={(v) => update("content", v)}
            placeholder="Share something, ask a question, post a puzzle… Markdown is supported."
            minHeight="180px"
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
          <Label>Image / GIF (Optional)</Label>
          <div className="flex space-x-2">
            <Input placeholder="Paste image or GIF URL, or upload..." value={draft.imageUrl} onChange={(e) => update("imageUrl", e.target.value)} disabled={isUploading} />
            <Button type="button" variant="outline" size="sm" className="px-3" disabled={isUploading} onClick={() => document.getElementById('file-upload')?.click()}>
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            </Button>
            <input id="file-upload" type="file" accept="image/*,image/gif,.gif" className="hidden" onChange={handleFileUpload} />
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

        <div className="space-y-2">
          <Label>Attachment (Optional)</Label>
          <div className="flex space-x-2">
            <Input
              placeholder="PDF, XML, DOC, XLS, TXT, ZIP..."
              value={draft.fileName}
              readOnly
              disabled={isUploadingFile}
            />
            <Button type="button" variant="outline" size="sm" className="px-3" disabled={isUploadingFile}
              onClick={() => document.getElementById('doc-upload')?.click()}>
              {isUploadingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
            </Button>
            <input id="doc-upload" type="file" className="hidden"
              accept=".pdf,.xml,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.json,.md,.zip"
              onChange={handleDocumentUpload} />
          </div>
          {draft.fileUrl && (
            <div className="mt-2 flex items-center justify-between rounded-lg border px-3 py-2">
              <span className="flex items-center gap-2 text-sm truncate">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate">{draft.fileName || "Attached file"}</span>
              </span>
              <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0"
                onClick={() => { update("fileUrl", ""); update("fileName", ""); }}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-2 border-t pt-4">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Attach a poll (optional)
            </Label>
            <Switch checked={draft.pollEnabled} onCheckedChange={(v) => update("pollEnabled", v)} />
          </div>
          {draft.pollEnabled && (
            <div className="space-y-2 pl-1">
              <Input placeholder="Poll question..." value={draft.pollQuestion} onChange={(e) => update("pollQuestion", e.target.value)} maxLength={200} />
              {draft.pollOptions.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <Input placeholder={`Option ${i + 1}`} value={opt}
                    onChange={(e) => { const next = [...draft.pollOptions]; next[i] = e.target.value; update("pollOptions", next); }}
                    maxLength={100} />
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
            {isChecking ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Checking links...</>) : "Post"}
          </Button>
          <Button type="button" variant="outline" onClick={handleClose}>Save & Close</Button>
        </div>
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <ShieldAlert className="h-3 w-3" /> Drafts auto-save locally. Links are scanned before publishing.
        </p>
      </form>
    </Card>
  );
};

export default CreatePostForm;
