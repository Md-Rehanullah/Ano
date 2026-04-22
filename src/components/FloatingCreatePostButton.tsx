import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { PenSquare, Upload, X, Loader2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const categories = ["General", "Technology", "Education", "Lifestyle", "Other"];

// Routes where the floating create button is hidden
const HIDDEN_ROUTES = ["/about", "/contact", "/collaborate", "/auth", "/admin", "/privacy"];

interface Props {
  /** Optional custom handler. If omitted, the FAB writes to Supabase directly and reloads the page. */
  onCreatePost?: (post: { title: string; description: string; category: string; imageUrl?: string; videoUrl?: string }) => void;
}

const FloatingCreatePostButton = ({ onCreatePost }: Props) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Hide on certain routes
  if (HIDDEN_ROUTES.some(r => location.pathname.startsWith(r))) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast({ title: "Invalid file", variant: "destructive" }); return; }
    if (file.size > 5 * 1024 * 1024) { toast({ title: "File too large", variant: "destructive" }); return; }
    setIsUploading(true);
    try {
      const filePath = `${Math.random()}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('post-images').upload(filePath, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(filePath);
      setImageUrl(publicUrl);
    } catch { toast({ title: "Upload failed", variant: "destructive" }); }
    finally { setIsUploading(false); }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) { toast({ title: "Invalid file", variant: "destructive" }); return; }
    if (file.size > 50 * 1024 * 1024) { toast({ title: "File too large", variant: "destructive" }); return; }
    setIsUploadingVideo(true);
    try {
      const filePath = `videos/${Math.random()}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('post-images').upload(filePath, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(filePath);
      setVideoUrl(publicUrl);
    } catch { toast({ title: "Upload failed", variant: "destructive" }); }
    finally { setIsUploadingVideo(false); }
  };

  const reset = () => {
    setTitle(""); setDescription(""); setCategory("General"); setImageUrl(""); setVideoUrl("");
  };

  const defaultCreate = async (newPost: { title: string; description: string; category: string; imageUrl?: string; videoUrl?: string }) => {
    if (!user) { navigate("/auth"); return; }
    setIsPosting(true);
    try {
      const { data, error } = await supabase.from("posts").insert({
        user_id: user.id,
        title: newPost.title,
        description: newPost.description,
        category: newPost.category,
        image_url: newPost.imageUrl,
        video_url: newPost.videoUrl,
      }).select().single();
      if (error) throw error;
      toast({ title: "Post created!" });
      // Notify any listening feed (Homepage) to prepend the new post optimistically — no reload.
      window.dispatchEvent(new CustomEvent("bridge:new-post", { detail: data }));
      // If we're not already on the home feed, navigate there so the user sees it.
      if (location.pathname !== "/") navigate("/");
    } catch (e) {
      toast({ title: "Failed to create post", variant: "destructive" });
    } finally {
      setIsPosting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) { toast({ title: "Missing information", variant: "destructive" }); return; }
    const payload = { title: title.trim(), description: description.trim(), category, imageUrl: imageUrl.trim() || undefined, videoUrl: videoUrl.trim() || undefined };
    if (onCreatePost) {
      onCreatePost(payload);
    } else {
      await defaultCreate(payload);
    }
    reset();
    setIsDialogOpen(false);
  };

  return (
    <>
      <Button
        onClick={() => user ? setIsDialogOpen(true) : navigate("/auth")}
        className="fixed bottom-20 right-6 z-50 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 p-0"
        aria-label="Create a new post"
      >
        <PenSquare className="h-6 w-6" />
      </Button>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create New Post</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Title/Heading *</Label>
              <Input placeholder="Enter your question or content title..." value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
            </div>
            <div className="space-y-2">
              <Label>Description/Question *</Label>
              <Textarea placeholder="Provide more details..." value={description} onChange={(e) => setDescription(e.target.value)} className="resize-none" rows={4} maxLength={1000} />
              <div className="text-xs text-muted-foreground text-right">{description.length}/1000</div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="General" /></SelectTrigger>
                <SelectContent>{categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Image (Optional)</Label>
              <div className="flex space-x-2">
                <Input placeholder="Paste image URL or upload..." value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} disabled={isUploading} />
                <Button type="button" variant="outline" size="sm" className="px-3" disabled={isUploading} onClick={() => document.getElementById('fab-file-upload')?.click()}>
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                </Button>
                <input id="fab-file-upload" type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </div>
              {imageUrl && (
                <div className="mt-2 relative">
                  <img src={imageUrl} alt="Preview" className="max-w-full h-32 object-cover rounded-lg" />
                  <Button type="button" variant="destructive" size="sm" className="absolute top-2 right-2" onClick={() => setImageUrl("")}><X className="h-3 w-3" /></Button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Video (Optional)</Label>
              <div className="flex space-x-2">
                <Input placeholder="Paste video URL or upload..." value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} disabled={isUploadingVideo} />
                <Button type="button" variant="outline" size="sm" className="px-3" disabled={isUploadingVideo} onClick={() => document.getElementById('fab-video-upload')?.click()}>
                  {isUploadingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
                </Button>
                <input id="fab-video-upload" type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
              </div>
              {videoUrl && (
                <div className="mt-2 relative">
                  <video src={videoUrl} className="max-w-full h-32 rounded-lg" controls />
                  <Button type="button" variant="destructive" size="sm" className="absolute top-2 right-2" onClick={() => setVideoUrl("")}><X className="h-3 w-3" /></Button>
                </div>
              )}
            </div>
            <div className="flex space-x-3 pt-4">
              <Button type="submit" className="flex-1" disabled={isPosting}>
                {isPosting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Posting...</> : "Post"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FloatingCreatePostButton;
