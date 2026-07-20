import React from 'react';

export default function DownloadCTA() {
  return (
    <section id="download" className="section download-section">
      <div>
        <p className="eyebrow">Create Your Account</p>

        <h2>
          Build basketball habits that separate great players.
        </h2>

        <p>
          CourtStreak works on any phone, tablet, or computer. Create your
          account in seconds, track your progress, build your streak, earn
          badges, and compete with the people who push you to improve.
        </p>
      </div>

      <div className="download-card">
        <h3>Your next workout is waiting.</h3>

        <p>
          Create your CourtStreak account today and begin building the
          consistency that separates great players.
        </p>

        <div
          style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            marginTop: '20px'
          }}
        >
          <a href="/courtstreak-site/create-account">
            Create Account
          </a>

          <a
            href="/courtstreak-site/login"
            style={{
              background: 'transparent',
              border: '2px solid white',
              padding: '12px 22px',
              borderRadius: '10px',
              color: 'white',
              textDecoration: 'none',
              fontWeight: '600'
            }}
          >
            Log In
          </a>
        </div>
      </div>
    </section>
  );
}
