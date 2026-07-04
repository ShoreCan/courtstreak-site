const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

Deno.serve(async (req) => {
  try {
    const { email } = await req.json();

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "CourtStreak <onboarding@resend.dev>",
        to: [email],
        subject: "You’re on the CourtStreak waitlist 🏀",
        html: `
          <div style="font-family: Arial, sans-serif; background:#f8fafc; padding:32px;">
            <div style="max-width:620px; margin:0 auto; background:white; border-radius:24px; overflow:hidden; border:1px solid #e2e8f0;">
              <div style="background:#0f172a; padding:32px;">
                <h1 style="color:white; margin:0; font-size:32px;">CourtStreak</h1>
                <p style="color:#fb923c; margin:8px 0 0; font-weight:700;">Build Better Habits.</p>
              </div>
              <div style="padding:32px;">
                <h2 style="color:#0f172a;">You’re officially on the waitlist.</h2>
                <p style="color:#475569; line-height:1.7;">
                  CourtStreak is built to help players build discipline, stay accountable,
                  and improve anywhere, anytime.
                </p>
                <div style="background:#fff7ed; border:1px solid #fed7aa; border-radius:18px; padding:20px;">
                  <p>✓ Daily workouts</p>
                  <p>✓ Streak tracking</p>
                  <p>✓ XP and badges</p>
                  <p>✓ Training Circles</p>
                  <p>✓ Friend and team challenges</p>
                  <p>✓ Coach and parent visibility</p>
                </div>
                <p style="color:#475569; line-height:1.7;">
                  For players: build a streak you don’t want to lose.<br/>
                  For parents: see consistency, effort, and real progress.
                </p>
                <p style="font-weight:700;">
                  Thanks for being early.<br/>
                  — Trey<br/>
                  Founder, CourtStreak
                </p>
              </div>
            </div>
          </div>
        `,
      }),
    });

    const data = await res.json();

    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
