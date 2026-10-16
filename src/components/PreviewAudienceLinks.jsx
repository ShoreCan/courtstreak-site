import React from "react";
import { Link } from "react-router-dom";
import { Activity, ShieldCheck, Users, ArrowUpRight } from "lucide-react";
import "../preview-audiences.css";
export default function PreviewAudienceLinks({ compact = false }) {
  return <nav className={`cs-preview-audiences${compact ? " compact" : ""}`} aria-label="Choose a CourtStreak preview">
    {!compact && <div className="cs-preview-audiences-heading"><strong>See CourtStreak from your side.</strong><span>No account needed · Fictional sample data</span></div>}
    <div className="cs-preview-audiences-links">
      {[
        ["Player", "/preview/player", "Explore training and your progress", Activity],
        ["Parent", "/preview/hub?view=parent", "Follow your child’s work and progress", ShieldCheck],
        ["Coach", "/preview/hub?view=coach", "See team effort and assignment tools", Users],
      ].map(([name, to, detail, Icon]) => <Link key={name} to={to}><Icon size={19} aria-hidden="true" /><span><strong>{name} preview</strong>{!compact && <small>{detail}</small>}</span><ArrowUpRight size={15} aria-hidden="true" /></Link>)}
    </div>
  </nav>;
}
