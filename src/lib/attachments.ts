import { supabase } from "@/integrations/supabase/client";

/**
 * Document attachments live in the PRIVATE `post-files` bucket.
 * We store a reference of the form `post-files:<path>` in posts.file_url
 * instead of a public URL, and mint a short-lived signed URL on demand.
 * Legacy rows may still hold a plain https URL — those keep working.
 */
export const PRIVATE_FILE_PREFIX = "post-files:";

export const isPrivateAttachment = (ref?: string | null) =>
  !!ref && ref.startsWith(PRIVATE_FILE_PREFIX);

export const attachmentPath = (ref: string) => ref.slice(PRIVATE_FILE_PREFIX.length);

/** Returns a usable URL for an attachment, or null if access is not permitted. */
export const resolveAttachmentUrl = async (ref?: string | null): Promise<string | null> => {
  if (!ref) return null;
  if (!isPrivateAttachment(ref)) return ref;

  const { data, error } = await supabase.storage
    .from("post-files")
    .createSignedUrl(attachmentPath(ref), 60);

  if (error || !data?.signedUrl) {
    console.error("Failed to sign attachment URL", { ref, error });
    return null;
  }
  return data.signedUrl;
};

/** Extensions that are never accepted as document attachments. */
export const BLOCKED_DOC_EXT = [
  "exe", "msi", "bat", "cmd", "com", "scr", "pif", "cpl", "jar", "js", "mjs",
  "vbs", "vbe", "ps1", "psm1", "sh", "bash", "apk", "app", "dmg", "deb", "rpm",
  "dll", "so", "bin", "iso", "reg", "lnk", "hta", "wsf", "php", "py", "rb", "pl",
];

/** ext -> accepted MIME types (empty array = browser did not report one). */
export const ALLOWED_DOC_TYPES: Record<string, string[]> = {
  pdf: ["application/pdf"],
  xml: ["text/xml", "application/xml"],
  txt: ["text/plain"],
  csv: ["text/csv", "application/csv", "text/plain"],
  md: ["text/markdown", "text/plain", "text/x-markdown"],
  json: ["application/json", "text/plain"],
  doc: ["application/msword"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  xls: ["application/vnd.ms-excel"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ppt: ["application/vnd.ms-powerpoint"],
  pptx: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
};

export const MAX_DOC_BYTES = 20 * 1024 * 1024;

export interface DocValidation { ok: boolean; error?: string; ext?: string }

export const validateDocument = (file: File): DocValidation => {
  const name = file.name || "";
  const parts = name.toLowerCase().split(".");
  const ext = parts.length > 1 ? parts.pop()! : "";

  if (!ext) return { ok: false, error: "The file has no extension." };

  // Disguised / double extensions, e.g. "invoice.pdf.exe" or "report.exe.pdf"
  const allExts = parts.slice(1).concat(ext);
  if (allExts.some((e) => BLOCKED_DOC_EXT.includes(e))) {
    return { ok: false, error: "Executable or script files are not allowed." };
  }
  if (allExts.length > 1) {
    return { ok: false, error: "Files with multiple extensions are not allowed." };
  }
  if (/[\u0000-\u001f\/\\]|\u202e/.test(name)) {
    return { ok: false, error: "The file name contains invalid characters." };
  }

  const allowedMimes = ALLOWED_DOC_TYPES[ext];
  if (!allowedMimes) {
    return { ok: false, error: `Allowed types: ${Object.keys(ALLOWED_DOC_TYPES).join(", ")}.` };
  }
  const mime = (file.type || "").toLowerCase();
  if (mime && !allowedMimes.includes(mime)) {
    return { ok: false, error: "The file content type does not match its extension." };
  }
  if (file.size === 0) return { ok: false, error: "The file is empty." };
  if (file.size > MAX_DOC_BYTES) return { ok: false, error: "Max 20MB." };

  return { ok: true, ext };
};
