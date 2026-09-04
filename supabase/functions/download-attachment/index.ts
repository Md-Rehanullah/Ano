import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PRIVATE_FILE_PREFIX = "post-files:";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authentication required." }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const token = authHeader.slice("Bearer ".length).trim();

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing Supabase server configuration.");

      return new Response(
        JSON.stringify({ error: "Server configuration error." }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: userError,
    } = await admin.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired session." }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const body = await req.json().catch(() => null);
    const fileRef =
      typeof body?.fileRef === "string" ? body.fileRef.trim() : "";

    if (!fileRef.startsWith(PRIVATE_FILE_PREFIX)) {
      return new Response(
        JSON.stringify({ error: "Invalid attachment reference." }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const filePath = fileRef.slice(PRIVATE_FILE_PREFIX.length).trim();

    if (!filePath || filePath.includes("..") || filePath.startsWith("/")) {
      return new Response(
        JSON.stringify({ error: "Invalid attachment path." }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const pathParts = filePath.split("/");

    if (pathParts.length !== 3 || pathParts[1] !== "files") {
      return new Response(
        JSON.stringify({ error: "Invalid attachment path." }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const ownerId = pathParts[0];

    

    const { data: post, error: postError } = await admin
      .from("posts")
      .select("id, user_id, is_hidden, file_url")
      .eq("file_url", fileRef)
      .maybeSingle();

    if (postError) {
      console.error("Failed to verify attachment post:", postError);

      return new Response(
        JSON.stringify({ error: "Could not verify attachment access." }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!post) {
      return new Response(
        JSON.stringify({ error: "Attachment not found." }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (post.user_id !== ownerId) {
  return new Response(
    JSON.stringify({ error: "Attachment is not available." }),
    {
      status: 403,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    }
  );
}

    const isOwner = post.user_id === user.id;

    let isAdmin = false;

    const { data: roleData, error: roleError } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleError && roleData?.role === "admin") {
      isAdmin = true;
    }

    if (!isOwner && !isAdmin) {
      if (post.is_hidden) {
        return new Response(
          JSON.stringify({ error: "Attachment is not available." }),
          {
            status: 403,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      if (post.user_id) {
const { data: blocked, error: blockedError } = await admin.rpc(
  "is_blocked_with",
  {
    _viewer: user.id,
    _other: post.user_id,
  }
);

        if (blockedError) {
          console.error("Failed to verify block status:", blockedError);

          return new Response(
            JSON.stringify({ error: "Could not verify attachment access." }),
            {
              status: 500,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
              },
            }
          );
        }

        if (blocked) {
          return new Response(
            JSON.stringify({ error: "Attachment is not available." }),
            {
              status: 403,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
              },
            }
          );
        }

        const { data: privateProfile, error: privateProfileError } =
  await admin.rpc("is_profile_private", {
    _uid: post.user_id,
  });

        if (privateProfileError) {
          console.error(
            "Failed to verify profile visibility:",
            privateProfileError
          );

          return new Response(
            JSON.stringify({ error: "Could not verify attachment access." }),
            {
              status: 500,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
              },
            }
          );
        }

        if (privateProfile) {
          return new Response(
            JSON.stringify({ error: "Attachment is not available." }),
            {
              status: 403,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
              },
            }
          );
        }
      }
    }

    const { data, error: signedUrlError } = await admin.storage
      .from("post-files")
      .createSignedUrl(filePath, 60);

    if (signedUrlError || !data?.signedUrl) {
      console.error("Failed to create signed attachment URL:", signedUrlError);

      return new Response(
        JSON.stringify({ error: "Could not create attachment link." }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        signedUrl: data.signedUrl,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Unexpected download-attachment error:", error);

    return new Response(
      JSON.stringify({ error: "Could not download attachment." }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
