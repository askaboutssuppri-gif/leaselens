import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const FREE_SCAN_LIMIT = 1;
const PAID_DAILY_SCAN_LIMIT = 10;
const MAX_PAGES = 12;

interface AnalyzeRequestBody {
  lease_id: string;
  title: string;
  page_count: number;
  image_paths: string[];
  state_code: string | null;
}

interface GeminiFinding {
  severity: "high" | "medium" | "low";
  category: string;
  clause_text: string;
  plain_english: string;
  why_it_matters: string;
  negotiation_tip: string;
}

interface GeminiKeyTerms {
  monthly_rent: number | null;
  deposit: number | null;
  lease_start: string | null;
  lease_end: string | null;
  late_fee: string | null;
  notice_period_days: number | null;
  pet_policy: string | null;
  utilities_included: string | null;
}

interface GeminiResponse {
  is_residential_lease: boolean;
  health_score: number;
  summary: string;
  key_terms: GeminiKeyTerms;
  findings: GeminiFinding[];
  state_notes: string[];
  disclaimer: string;
}

const SYSTEM_PROMPT = `You are LeaseLens, an expert lease analysis assistant for US residential leases.
You receive page images of a lease document and must analyze them thoroughly.

Your task:
1. Determine if this is a residential lease (not commercial, not an employment contract, not a rental application). If not, return {"is_residential_lease": false}.
2. If it is a residential lease, analyze every clause and return a structured analysis.

Return STRICT JSON with this exact schema (no markdown, no extra text):
{
  "is_residential_lease": boolean,
  "health_score": number (0-100, where 100 = very tenant-friendly, 0 = extremely risky),
  "summary": string (2-3 sentence plain-English overview of the lease),
  "key_terms": {
    "monthly_rent": number or null,
    "deposit": number or null,
    "lease_start": "YYYY-MM-DD" or null,
    "lease_end": "YYYY-MM-DD" or null,
    "late_fee": string or null,
    "notice_period_days": number or null,
    "pet_policy": string or null,
    "utilities_included": string or null
  },
  "findings": [
    {
      "severity": "high" | "medium" | "low",
      "category": string (e.g. "Rent", "Deposit", "Pets", "Termination", "Maintenance", "Liability", "Subletting", "Entry Rights"),
      "clause_text": string (exact quote from the lease),
      "plain_english": string (simple explanation),
      "why_it_matters": string (practical impact on the tenant),
      "negotiation_tip": string (specific actionable advice)
    }
  ],
  "state_notes": [string] (state-specific tenant protections that apply based on the state_code),
  "disclaimer": string (always: "LeaseLens provides general information, not legal advice. Consult a licensed attorney in your state for guidance specific to your situation.")
}

Guidelines:
- Flag clauses that are unusual, overly restrictive, or potentially illegal
- High severity = could cost significant money or seriously restrict tenant rights
- Medium severity = unusual or unfavorable but not egregious
- Low severity = minor or informational
- Always include the full disclaimer
- If state_code is provided, include relevant state-specific protections (e.g. security deposit limits, required notice periods, rent control laws)
- Return ONLY the JSON, no markdown fences, no preamble`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // === Auth verification ===
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return jsonError("Unauthorized", 401);
    }
    const token = authHeader.replace("Bearer ", "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    // Create client with user's token to verify auth
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: authError } = await userClient.auth.getUser();
    if (authError || !userData.user) {
      return jsonError("Unauthorized", 401);
    }
    const userId = userData.user.id;

    // Service client for DB writes and storage reads
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // === Parse request body ===
    const body: AnalyzeRequestBody = await req.json();
    const { lease_id, title, image_paths, state_code } = body;

    if (!lease_id || !image_paths || image_paths.length === 0) {
      return jsonError("Missing required fields", 400);
    }
    if (image_paths.length > MAX_PAGES) {
      return jsonError(`Too many pages. Maximum is ${MAX_PAGES}.`, 400);
    }

    // === Check scan quota ===
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("free_scans_used, paid_scans_date, paid_scans_used_today")
      .eq("id", userId)
      .maybeSingle();

    const { data: subscription } = await serviceClient
      .from("subscriptions")
      .select("plan, status, expires_at")
      .eq("user_id", userId)
      .maybeSingle();

    const isPro =
      subscription?.plan === "pro" &&
      subscription?.status === "active" &&
      (!subscription?.expires_at || new Date(subscription.expires_at) > new Date());

    if (isPro) {
      // Check daily limit — reset if date changed
      const today = new Date().toISOString().split("T")[0];
      const paidDate = profile?.paid_scans_date;
      const paidUsedToday =
        paidDate === today ? (profile?.paid_scans_used_today ?? 0) : 0;

      if (paidUsedToday >= PAID_DAILY_SCAN_LIMIT) {
        return jsonError("You have reached your daily scan limit (10/day for Pro). Try again tomorrow.", 429);
      }
    } else {
      // Free user: 1 ever
      if ((profile?.free_scans_used ?? 0) >= FREE_SCAN_LIMIT) {
        return jsonError("You have used all your free scans. Upgrade to Pro for 10 scans per day.", 403);
      }
    }

    if (!GEMINI_API_KEY) {
      return jsonError("AI service is not configured. Please contact support.", 500);
    }

    // === Fetch page images from storage ===
    const imageParts: { inline_data: { mime_type: string; data: string } }[] = [];

    for (const path of image_paths) {
      const { data: fileData, error: downloadError } = await serviceClient
        .storage
        .from("lease-pages")
        .download(path);

      if (downloadError || !fileData) {
        return jsonError("Failed to retrieve uploaded document pages.", 500);
      }

      const arrayBuffer = await fileData.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      imageParts.push({
        inline_data: { mime_type: "image/jpeg", data: base64 },
      });
    }

    // === Call Gemini Flash API ===
    const geminiBody = {
      contents: [
        {
          role: "user",
          parts: [
            ...imageParts,
            {
              text: `${SYSTEM_PROMPT}\n\nThe user's state is: ${state_code ?? "Not specified"}.\n\nAnalyze this lease document and return the JSON.`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    };

    const geminiResponse = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiBody),
    });

    if (geminiResponse.status === 429) {
      return jsonError("High demand — retry in a minute.", 429);
    }

    if (!geminiResponse.ok) {
      const geminiErr = await geminiResponse.text();
      console.error("Gemini API error:", geminiErr);
      return jsonError("The AI analysis service is temporarily unavailable. Please try again.", 502);
    }

    const geminiData = await geminiResponse.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return jsonError("The AI did not return a valid analysis. Please try again.", 502);
    }

    // === Parse Gemini response ===
    let analysis: GeminiResponse;
    try {
      // Strip any potential markdown fences
      const cleaned = rawText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      analysis = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse Gemini response:", rawText.substring(0, 500));
      return jsonError("The AI returned an unexpected response. Please try again.", 502);
    }

    // === Check if it's a lease ===
    if (!analysis.is_residential_lease) {
      // Clean up uploaded files
      for (const path of image_paths) {
        await serviceClient.storage.from("lease-pages").remove([path]);
      }
      return jsonResponse({ error: "not_a_lease" }, 200);
    }

    // === Save to database ===
    // Insert lease
    const { error: leaseError } = await serviceClient.from("leases").insert({
      id: lease_id,
      user_id: userId,
      title,
      page_count: image_paths.length,
      raw_pdf_path: image_paths[0] ?? null,
      health_score: Math.max(0, Math.min(100, Math.round(analysis.health_score))),
      summary: analysis.summary,
      state_notes: analysis.state_notes ?? [],
    });

    if (leaseError) {
      console.error("Failed to insert lease:", leaseError.message);
      return jsonError("Failed to save lease analysis. Please try again.", 500);
    }

    // Insert key terms
    if (analysis.key_terms) {
      const kt = analysis.key_terms;
      await serviceClient.from("key_terms").insert({
        lease_id,
        monthly_rent: kt.monthly_rent,
        deposit: kt.deposit,
        lease_start: kt.lease_start,
        lease_end: kt.lease_end,
        late_fee: kt.late_fee,
        notice_period_days: kt.notice_period_days,
        pet_policy: kt.pet_policy,
        utilities_included: kt.utilities_included,
      });
    }

    // Insert findings
    if (analysis.findings && analysis.findings.length > 0) {
      const findingRows = analysis.findings.map((f) => ({
        lease_id,
        severity: f.severity,
        category: f.category,
        clause_text: f.clause_text,
        plain_english: f.plain_english,
        why_it_matters: f.why_it_matters,
        negotiation_tip: f.negotiation_tip,
      }));
      const { error: findingsError } = await serviceClient
        .from("findings")
        .insert(findingRows);
      if (findingsError) {
        console.error("Failed to insert findings:", findingsError.message);
      }
    }

    // === Increment scan counter ===
    if (isPro) {
      const today = new Date().toISOString().split("T")[0];
      const paidDate = profile?.paid_scans_date;
      const newCount = paidDate === today ? (profile?.paid_scans_used_today ?? 0) + 1 : 1;
      await serviceClient
        .from("profiles")
        .update({ paid_scans_date: today, paid_scans_used_today: newCount })
        .eq("id", userId);
    } else {
      await serviceClient
        .from("profiles")
        .update({ free_scans_used: (profile?.free_scans_used ?? 0) + 1 })
        .eq("id", userId);
    }

    // === Return report ===
    const report = {
      lease_id,
      health_score: Math.max(0, Math.min(100, Math.round(analysis.health_score))),
      summary: analysis.summary,
      key_terms: analysis.key_terms,
      findings: analysis.findings ?? [],
      state_notes: analysis.state_notes ?? [],
      disclaimer:
        analysis.disclaimer ||
        "LeaseLens provides general information, not legal advice. Consult a licensed attorney in your state for guidance specific to your situation.",
    };

    return jsonResponse({ report }, 200);
  } catch (err) {
    console.error("analyze-lease error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return jsonError(msg, 500);
  }
});

function jsonResponse(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonError(message: string, status: number) {
  return jsonResponse({ error: message }, status);
}
/* end */
