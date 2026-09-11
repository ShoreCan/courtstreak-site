import React from 'react';
import {
  Activity,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Flame,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';

const players = [
  {
    name: 'Trey R.',
    streak: '17 day streak',
    activity: '3 drills today',
    xp: '+35 XP',
    status: 'active',
  },
  {
    name: 'Jordan M.',
    streak: '12 day streak',
    activity: '2 drills today',
    xp: '+20 XP',
    status: 'active',
  },
  {
    name: 'Mason K.',
    streak: '4 day streak',
    activity: 'Last trained yesterday',
    xp: '+15 XP',
    status: 'watch',
  },
  {
    name: 'Tyler B.',
    streak: 'No active streak',
    activity: 'Inactive 6 days',
    xp: 'Check in',
    status: 'inactive',
  },
];

export default function CoachDashboard() {
  return (
    <section
      id="coach-dashboard"
      className="section coach-section cs-home-coach"
    >
      <div className="cs-home-coach-copy">
        <p className="eyebrow">FOR COACHES + TRAINERS</p>

        <h2>
          See who&apos;s
          <span> putting in the work.</span>
        </h2>

        <p>
          CourtStreak gives coaches and trainers a clearer view of player
          consistency, training activity, streaks, and progress — without
          forcing every athlete into the exact same workout.
        </p>

        <div className="cs-home-coach-points">
          <div>
            <Activity size={19} />

            <span>
              <strong>See Training Activity</strong>
              Know who is consistently putting in reps.
            </span>
          </div>

          <div>
            <TrendingUp size={19} />

            <span>
              <strong>Track Progress</strong>
              Follow XP, streaks, and player development over time.
            </span>
          </div>

          <div>
            <AlertCircle size={19} />

            <span>
              <strong>Spot Drop-Off Early</strong>
              See when a player may need an extra push.
            </span>
          </div>
        </div>

        <div className="cs-home-coach-note">
          <Target size={18} />

          <p>
            Players still choose what they want to improve.
            <strong> Coaches get visibility without taking away ownership.</strong>
          </p>
        </div>
      </div>

      <div className="cs-home-coach-dashboard">
        <div className="cs-home-coach-dashboard-top">
          <div>
            <span>TEAM OVERVIEW</span>
            <h3>Midwest Elite 2029</h3>
          </div>

          <div className="cs-home-coach-live">
            <span />
            LIVE
          </div>
        </div>

        <div className="cs-home-coach-stats">
          <div>
            <Users size={18} />
            <strong>36</strong>
            <span>Players</span>
          </div>

          <div>
            <Flame size={18} />
            <strong>18</strong>
            <span>Active Streaks</span>
          </div>

          <div>
            <BarChart3 size={18} />
            <strong>142</strong>
            <span>Drills This Week</span>
          </div>
        </div>

        <div className="cs-home-coach-table-heading">
          <span>PLAYER</span>
          <span>ACTIVITY</span>
          <span>PROGRESS</span>
        </div>

        <div className="cs-home-coach-player-list">
          {players.map((player) => (
            <div
              className={`cs-home-coach-player ${player.status}`}
              key={player.name}
            >
              <div className="cs-home-coach-player-name">
                <span className="cs-home-coach-avatar">
                  {player.name.charAt(0)}
                </span>

                <span>
                  <strong>{player.name}</strong>
                  <small>{player.streak}</small>
                </span>
              </div>

              <span className="cs-home-coach-activity">
                {player.activity}
              </span>

              <strong className="cs-home-coach-xp">
                {player.xp}
              </strong>
            </div>
          ))}
        </div>

        <div className="cs-home-coach-dashboard-bottom">
          <div>
            <CheckCircle2 size={17} />

            <span>
              <strong>29 players active this week</strong>
              Team consistency is trending up
            </span>
          </div>

          <span className="cs-home-coach-trend">
            <TrendingUp size={15} />
            +18%
          </span>
        </div>
      </div>
    </section>
  );
}