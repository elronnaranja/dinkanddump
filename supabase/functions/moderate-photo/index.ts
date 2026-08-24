// supabase/functions/moderate-photo/index.ts
//
// Runs an already-uploaded profile photo through AWS Rekognition before the
// client is allowed to attach it to a profile: it must show exactly one
// clear human face, and must not trip Rekognition's content-moderation
// labels (nudity, explicit content, violence, etc.). Called by the client
// (see src/services/supabase/moderation.ts) right after uploadPhoto()
// finishes and before insertProfilePhoto() runs — on rejection the client
// deletes the just-uploaded storage object instead of ever attaching it to
// the profile.
//
// This MUST run server-side: the client can't be trusted to self-report
// whether its own photo is appropriate, and the AWS credentials below can
// never be shipped in the app bundle. Like delete-account, this is the only
// place these specific secrets are ever read.
//
// Required Edge Function secrets (see project README / setup notes for how
// to obtain and set these):
//   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY — an IAM user/role with only
//     rekognition:DetectFaces and rekognition:DetectModerationLabels
//     (no broader AWS access needed).
//   AWS_REGION — the Rekognition region to call, e.g. "us-east-1".
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are
// provisioned automatically for every Edge Function, same as elsewhere.

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  RekognitionClient,
  DetectFacesCommand,
  DetectModerationLabelsCommand,
} from "npm:@aws-sdk/client-rekognition@3";

const PHOTOS_BUCKET = "photos";
const MIN_FACE_CONFIDENCE = 90;
const MIN_MODERATION_CONFIDENCE = 60;

// Top-level Rekognition moderation categories to reject on. Matched against
// both a label's own Name and its ParentName, since Rekognition returns a
// hierarchy (e.g. "Explicit Nudity" -> "Graphic Male Nudity").
const REJECTED_MODERATION_CATEGORIES = new Set([
  "Explicit Nudity",
  "Nudity",
  "Sexual Activity",
  "Illustrated Explicit Nudity",
  "Adult Toys",
  "Violence",
  "Visually Disturbing",
  "Drugs",
  "Weapons",
  "Hate Symbols",
]);

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const awsAccessKeyId = Deno.env.get("AWS_ACCESS_KEY_ID");
  const awsSecretAccessKey = Deno.env.get("AWS_SECRET_ACCESS_KEY");
  const awsRegion = Deno.env.get("AWS_REGION");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error("moderate-photo: missing Supabase env");
    return jsonResponse({ ok: false, error: "Server misconfiguration. Please try again later." }, 500);
  }
  if (!awsAccessKeyId || !awsSecretAccessKey || !awsRegion) {
    console.error("moderate-photo: missing AWS env — has moderate-photo been configured yet?");
    return jsonResponse({ ok: false, error: "Server misconfiguration. Please try again later." }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ ok: false, error: "Not authenticated." }, 401);
  }

  let storagePath: string;
  try {
    const body = await req.json();
    storagePath = String(body?.storagePath ?? "");
  } catch {
    return jsonResponse({ ok: false, error: "Invalid request body." }, 400);
  }
  if (!storagePath) {
    return jsonResponse({ ok: false, error: "storagePath is required." }, 400);
  }

  // Caller's own JWT — used only to resolve who is making this request.
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
    error: userError,
  } = await callerClient.auth.getUser();
  if (userError || !user) {
    return jsonResponse({ ok: false, error: "Not authenticated." }, 401);
  }

  // The path must live under the caller's own prefix — a user can only ever
  // request moderation of (and, on approval, keep) their own upload, never
  // point this at someone else's storage object.
  if (!storagePath.startsWith(`${user.id}/`)) {
    return jsonResponse({ ok: false, error: "You can only moderate your own photos." }, 403);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: fileBlob, error: downloadError } = await adminClient.storage
    .from(PHOTOS_BUCKET)
    .download(storagePath);
  if (downloadError || !fileBlob) {
    console.error("moderate-photo: failed to download uploaded photo:", downloadError?.message);
    return jsonResponse({ ok: false, error: "Couldn't read the uploaded photo. Please try again." }, 500);
  }
  const imageBytes = new Uint8Array(await fileBlob.arrayBuffer());

  const rekognition = new RekognitionClient({
    region: awsRegion,
    credentials: { accessKeyId: awsAccessKeyId, secretAccessKey: awsSecretAccessKey },
  });

  try {
    const [facesResult, moderationResult] = await Promise.all([
      rekognition.send(new DetectFacesCommand({ Image: { Bytes: imageBytes } })),
      rekognition.send(
        new DetectModerationLabelsCommand({
          Image: { Bytes: imageBytes },
          MinConfidence: MIN_MODERATION_CONFIDENCE,
        })
      ),
    ]);

    const flaggedLabel = (moderationResult.ModerationLabels ?? []).find(
      (label) =>
        REJECTED_MODERATION_CATEGORIES.has(label.Name ?? "") ||
        REJECTED_MODERATION_CATEGORIES.has(label.ParentName ?? "")
    );
    if (flaggedLabel) {
      return jsonResponse(
        { ok: false, error: "This photo doesn't meet our content guidelines. Please choose a different photo." },
        200
      );
    }

    const faces = facesResult.FaceDetails ?? [];
    if (faces.length === 0) {
      return jsonResponse(
        { ok: false, error: "We couldn't find a clear face in this photo. Please use a photo that clearly shows your face." },
        200
      );
    }
    if (faces.length > 1) {
      return jsonResponse(
        { ok: false, error: "Please use a photo with just you in it." },
        200
      );
    }
    const face = faces[0];
    if ((face.Confidence ?? 0) < MIN_FACE_CONFIDENCE) {
      return jsonResponse(
        { ok: false, error: "We couldn't find a clear face in this photo. Please use a photo that clearly shows your face." },
        200
      );
    }

    return jsonResponse({ ok: true }, 200);
  } catch (e) {
    console.error("moderate-photo: Rekognition call failed:", e instanceof Error ? e.message : e);
    return jsonResponse({ ok: false, error: "Couldn't check this photo right now. Please try again." }, 500);
  }
});
