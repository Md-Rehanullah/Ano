import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { PenSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import CreatePostForm, { CreatePostPayload } from "@/components/CreatePostForm";

const HIDDEN_ROUTES = ["/about", "/contact", "/collaborate", "/auth", "/admin", "/privacy", "/terms"];

interface Props {
  onCreatePost?: (post: CreatePostPayload) => void;
}

const FloatingCreatePostButton = ({ onCreatePost }: Props) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (HIDDEN_ROUTES.some(r => location.pathname.startsWith(r))) return null;

  const defaultCreate = async (newPost: CreatePostPayload) => {
    if (!user) { navigate("/auth"); return; }
    try {
      const { data, error } = await supabase.from("posts").insert({
        user_id: user.id,
        title: newPost.title || null,
        description: newPost.description,
        category: newPost.category,
        image_url: newPost.imageUrl,
        video_url: newPost.videoUrl,
      }).select().single();
      if (error) throw error;

      if (newPost.poll) {
        const { data: pollRow, error: pollErr } = await supabase
          .from("polls" as any)
          .insert({ post_id: data.id, question: newPost.poll.question })
          .select("id")
          .single();
        if (!pollErr && pollRow) {
          await supabase.from("poll_options" as any).insert(
            newPost.poll.options.map((label, i) => ({ poll_id: (pollRow as any).id, label, position: i }))
          );
        }
      }

      window.dispatchEvent(new CustomEvent("bridge:new-post", { detail: data }));
      if (location.pathname !== "/") navigate("/");
    } catch {
      toast({ title: "Failed to create post", variant: "destructive" });
    }
  };

  const handleCreate = async (payload: CreatePostPayload) => {
    if (onCreatePost) onCreatePost(payload);
    else await defaultCreate(payload);
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
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="sr-only">Write a post</DialogTitle></DialogHeader>
          <CreatePostForm
            forceOpen
            onCreatePost={handleCreate}
            onRequestClose={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FloatingCreatePostButton;
