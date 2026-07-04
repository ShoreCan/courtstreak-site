const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { email } = await req.json();

    const html = `
      <div style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;">
        <div style="max-width:660px;margin:0 auto;padding:36px 16px;">
          <div style="background:#050816;border-radius:30px 30px 0 0;padding:36px;">
            <div style="display:inline-block;background:#ea580c;color:white;border-radius:14px;padding:11px 14px;font-weight:900;">CS</div>
            <h1 style="color:white;font-size:38px;line-height:1;margin:24px 0 10px;">Welcome to CourtStreak.</h1>
            <p style="color:#fb923c;font-size:17px;margin:0;font-weight:800;">Build Better Habits.</p>
          </div>

          <div style="background:white;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 30px 30px;padding:34px;">
            <h2 style="color:#0f172a;font-size:28px;margin:0 0 12px;">You’re officially on the waitlist.</h2>

            <p style="color:#475569;font-size:16px;line-height:1.7;margin:0 0 22px;">
              CourtStreak is being built to help players train consistently, compete with their circle,
              and track real progress anywhere, anytime.
            </p>

            <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:22px;padding:22px;margin:24px 0;">
              <h3 style="margin:0 0 14px;color:#0f172a;font-size:20px;">What you’ll get early access to:</h3>
              <p style="margin:9px 0;color:#334155;">✓ Daily basketball workouts</p>
              <p style="margin:9px 0;color:#334155;">✓ Streak tracking and XP</p>
              <p style="margin:9px 0;color:#334155;">✓ Badges and leaderboards</p>
              <p style="margin:9px 0;color:#334155;">✓ Private Training Circles</p>
              <p style="margin:9px 0;color:#334155;">✓ Friend and team challenges</p>
              <p style="margin:9px 0;color:#334155;">✓ Coach and parent visibility</p>
            </div>

            <div style="display:grid;gap:12px;margin:24px 0;">
              <div style="background:#f8fafc;border-radius:18px;padding:18px;">
                <strong style="color:#0f172a;">For players</strong>
                <p style="color:#475569;margin:6px 0 0;line-height:1.6;">Build a streak you don’t want to lose.</p>
              </div>
              <div style="background:#f8fafc;border-radius:18px;padding:18px;">
                <strong style="color:#0f172a;">For parents</strong>
                <p style="color:#475569;margin:6px 0 0;line-height:1.6;">See consistency, accountability, effort, and progress.</p>
              </div>
            </div>

            <a href="https://shorecan.github.io/courtstreak-site/" style="display:inline-block;background:#ea580c;color:white;text-decoration:none;padding:15px 20px;border-radius:999px;font-weight:900;margin-top:8px;">
              Visit CourtStreak
            </a>

            <p style="color:#0f172a;font-weight:700;line-height:1.6;margin-top:30px;">
              Thanks for being early.<br/>
              — Trey<br/>
              Founder, CourtStreak
            </p>

            <p style="color:#94a3b8;font-size:13px;margin-top:28px;">
              You received this because you joined the CourtStreak waitlist.
            </p>
          </div>
        </div>
      </div>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "CourtStreak <onboarding@resend.dev>",
        to: [email],
        subject: "Welcome to the CourtStreak waitlist 🏀",
        html,
      }),
    });

    const data = await resendResponse.json();

    return new Response(JSON.stringify(data), {
      status: resendResponse.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});
