import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { PlusCircle, Upload, X, Loader2, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CreatePostFormProps {
  onCreatePost: (post: { title: string; description: string; category: string; imageUrl?: string; videoUrl?: string }) => void;
}

const categories = ["General", "Technology", "Education", "Lifestyle", "Other"];

const CreatePostForm = ({ onCreatePost }: CreatePostFormProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const { toast } = useToast();

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
      setImageUrl(publicUrl);
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
      setVideoUrl(publicUrl);
      toast({ title: "Video uploaded!" });
    } catch { toast({ title: "Upload failed", variant: "destructive" }); }
    finally { setIsUploadingVideo(false); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) { toast({ title: "Missing information", variant: "destructive" }); return; }
    onCreatePost({ title: title.trim(), description: description.trim(), category, imageUrl: imageUrl.trim() || undefined, videoUrl: videoUrl.trim() || undefined });
    setTitle(""); setDescription(""); setCategory("General"); setImageUrl(""); setVideoUrl("");
    setIsOpen(false);
    toast({ title: "Post created!" });
  };

  if (!isOpen) {
    return (
      <Card className="p-6 mb-6 shadow-card hover:shadow-elegant transition-all duration-300 cursor-pointer" onClick={() => setIsOpen(true)}>
        <div className="flex items-center justify-center space-x-2 text-muted-foreground hover:text-primary transition-colors">
          <PlusCircle className="h-5 w-5" /><span className="font-medium">Write Content / Ask Question</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 mb-6 shadow-elegant">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Create New Post</h2>
        <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="h-8 w-8 p-0"><X className="h-4 w-4" /></Button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title/Heading *</Label>
          <Input id="title" placeholder="Enter your question or content title..." value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description/Question *</Label>
          <Textarea id="description" placeholder="Provide more details..." value={description} onChange={(e) => setDescription(e.target.value)} className="resize-none" rows={4} maxLength={1000} />
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
            <Button type="button" variant="outline" size="sm" className="px-3" disabled={isUploading} onClick={() => document.getElementById('file-upload')?.click()}>
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            </Button>
            <input id="file-upload" type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
          </div>
          {imageUrl && (
            <div className="mt-2 relative">
              <img src={imageUrl} alt="Preview" className="max-w-full h-32 object-cover rounded-lg" onError={() => { toast({ title: "Invalid image", variant: "destructive" }); setImageUrl(""); }} />
              <Button type="button" variant="destructive" size="sm" className="absolute top-2 right-2" onClick={() => setImageUrl("")}><X className="h-3 w-3" /></Button>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label>Video (Optional)</Label>
          <div className="flex space-x-2">
            <Input placeholder="Paste video URL or upload..." value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} disabled={isUploadingVideo} />
            <Button type="button" variant="outline" size="sm" className="px-3" disabled={isUploadingVideo} onClick={() => document.getElementById('video-upload')?.click()}>
              {isUploadingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
            </Button>
            <input id="video-upload" type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
          </div>
          {videoUrl && (
            <div className="mt-2 relative">
              <video src={videoUrl} className="max-w-full h-32 rounded-lg" controls />
              <Button type="button" variant="destructive" size="sm" className="absolute top-2 right-2" onClick={() => setVideoUrl("")}><X className="h-3 w-3" /></Button>
            </div>
          )}
        </div>
        <div className="flex space-x-3 pt-4">
          <Button type="submit" className="flex-1">Post Question/Content</Button>
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
        </div>
      </form>
    </Card>
  );
};

export default CreatePostForm;
