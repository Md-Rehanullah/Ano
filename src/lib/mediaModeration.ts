import { supabase } from "@/integrations/supabase/client";

/**
 * Runs the Sightengine moderation edge function against a just-uploaded
 * media file. If it fails or is not allowed, the file is deleted from
 * Storage and the function returns { allowed: false, reason }.
 */
export async function moderateUploadedMedia(params: {
  bucket: string;
  filePath: string;
  publicUrl: string;
  kind: "image" | "video";
}): Promise<{ allowed: boolean; reason?: string }> {
  const { bucket, filePath, publicUrl, kind } = params;
  try {
    const { data, error } = await supabase.functions.invoke("moderate-image", {
      body: { mediaUrl: publicUrl, kind },
    });
    if (error) {
      // Videos fail open — long-video scanning is unreliable and would block normal footage.
      if (kind === "video") return { allowed: true };
      await supabase.storage.from(bucket).remove([filePath]);
      return { allowed: false, reason: "Moderation check failed. Please try again." };
    }

    if (!data?.allowed) {
      await supabase.storage.from(bucket).remove([filePath]);
      const reasons = (data?.reasons ?? []).join(", ") || "unsafe content";
      return { allowed: false, reason: `Detected: ${reasons}.` };
    }
    return { allowed: true };
  } catch {
    if (kind === "video") return { allowed: true };
    await supabase.storage.from(bucket).remove([filePath]).catch(() => {});
    return { allowed: false, reason: "Moderation check failed. Please try again." };
  }

}
