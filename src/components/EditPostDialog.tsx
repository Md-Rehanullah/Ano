import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, AlertCircle, Loader2 } from "lucide-react";

interface Post {
  id: string;
  title: string;
  description: string;
  category: string;
  created_at?: string;
}

interface EditPostDialogProps {
  post: Post | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (postId: string, data: { title: string; description: string; category: string }) => Promise<void>;
}

const categories = ["General", "Technology", "Education", "Lifestyle", "Other"];
const EDIT_WINDOW_MIN = 30;

const formatRemaining = (ms: number) => {
  if (ms <= 0) return "expired";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
};

const EditPostDialog = ({ post, open, onOpenChange, onSave }: EditPostDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [isSaving, setIsSaving] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (post) {
      setTitle(post.title);
      setDescription(post.description);
      setCategory(post.category || "General");
    }
  }, [post]);

  // Tick every second to update the remaining-time display
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [open]);

  const createdAt = post?.created_at ? new Date(post.created_at).getTime() : null;
  const deadline = createdAt ? createdAt + EDIT_WINDOW_MIN * 60_000 : null;
  const remainingMs = deadline ? deadline - now : null;
  const expired = remainingMs !== null && remainingMs <= 0;

  const handleSave = async () => {
    if (!post || !title.trim() || !description.trim() || !category) return;
    if (expired) return;
    setIsSaving(true);
    try {
      await onSave(post.id, { title: title.trim(), description: description.trim(), category });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Edit Post</DialogTitle>
          <DialogDescription>
            You can edit a post within {EDIT_WINDOW_MIN} minutes of posting it.
          </DialogDescription>
        </DialogHeader>

        {remainingMs !== null && (
          <div
            className={
              "flex items-center gap-2 text-xs rounded-md px-3 py-2 " +
              (expired
                ? "bg-destructive/10 text-destructive"
                : "bg-primary/10 text-primary")
            }
          >
            {expired ? <AlertCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
            {expired
              ? "The 30-minute edit window has expired. This post can no longer be edited."
              : `Time remaining to edit: ${formatRemaining(remainingMs)}`}
          </div>
        )}

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter post title"
              maxLength={200}
              disabled={expired}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter post description"
              className="min-h-[140px] resize-y"
              maxLength={10000}
              disabled={expired}
            />
            <p className="text-[11px] text-muted-foreground text-right">{description.length}/10000</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory} disabled={expired}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || expired || !title.trim() || !description.trim() || !category}
          >
            {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditPostDialog;
