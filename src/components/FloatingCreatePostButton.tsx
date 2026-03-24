import { useState, useEffect } from "react";
import { PenSquare, Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const categories = ["General", "Technology", "Education", "Lifestyle", "Other"];

interface FloatingCreatePostButtonProps {
  onCreatePost: (post: { title: string; description: string; category: string; imageUrl?: string }) => void;
}

const FloatingCreatePostButton = ({ onCreatePost }: FloatingCreatePostButtonProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [imageUrl, setImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handleScroll = () => { setIsVisible(window.scrollY > 900); };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast({ title: "Invalid file", variant: "destructive" }); return; }
    if (file.size > 5 * 1024 * 1024) { toast({ title: "File too large", variant: "destructive" }); return; }
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${Math.random()}.${fileExt}`;
      const { error } = await supabase.storage.from('post-images').upload(filePath, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(filePath);
      setImageUrl(publicUrl);
    } catch { toast({ title: "Upload failed", variant: "destructive" }); }
    finally { setIsUploading(false); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast({ title: "Missing information", variant: "destructive" });
      return;
    }
    onCreatePost({ title: title.trim(), description: description.trim(), category, imageUrl: imageUrl.trim() || undefined });
    setTitle(""); setDescription(""); setCategory("General"); setImageUrl("");
    setIsDialogOpen(false);
  };

  if (!isVisible) return null;

  return (
    <>
      <Button onClick={() => setIsDialogOpen(true)} className="fixed bottom-20 right-6 z-50 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 p-0 animate-in fade-in zoom-in" aria-label="Create a new post">
        <PenSquare className="h-6 w-6" />
      </Button>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create New Post</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fab-title">Title/Heading *</Label>
              <Input id="fab-title" placeholder="Enter your question or content title..." value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fab-desc">Description/Question *</Label>
              <Textarea id="fab-desc" placeholder="Provide more details..." value={description} onChange={(e) => setDescription(e.target.value)} className="resize-none" rows={4} maxLength={1000} />
              <div className="text-xs text-muted-foreground text-right">{description.length}/1000</div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="General" /></SelectTrigger>
                <SelectContent>{categories.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}</SelectContent>
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
            <div className="flex space-x-3 pt-4">
              <Button type="submit" className="flex-1">Post Question/Content</Button>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FloatingCreatePostButton;
