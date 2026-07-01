import React from 'react';

export default function Navbar() {
  return (
    <nav className="nav">
      <a className="brand" href="#top">
        <span className="brand-mark">CS</span>
        <span>CourtStreak</span>
      </a>
      <div className="nav-links">
        <a href="#challenge">Challenges</a>
        <a href="#parents">Parents</a>
        <a href="#reviews">Reviews</a>
        <a href="#pricing">Pricing</a>
      </div>
      <a className="nav-cta" href="#join">Join Beta</a>
    </nav>
  );
}
