import React from 'react';

export default function Navbar() {
  return (
    <nav className="nav">
      <a className="brand" href="#top">
        <span className="brand-mark">CS</span>
        <span>CourtStreak</span>
      </a>

      <div className="nav-links nav-menu">
        <div className="nav-group">
          <button>Membership</button>
          <div className="dropdown">
            <a href="#pricing">Pricing</a>
            <a href="#join">Create Account</a>
          </div>
        </div>

        <div className="nav-group">
          <button>Groups</button>
          <div className="dropdown">
            <a href="#challenge">Training Circles</a>
            <a href="#parents">Parents</a>
            <a href="#challenge">Teams</a>
            <a href="#challenge">Coaches</a>
          </div>
        </div>

        <div className="nav-group">
          <button>Support</button>
          <div className="dropdown">
            <a href="#faq">FAQ</a>
            <a href="#reviews">Reviews</a>
          </div>
        </div>

        <div className="nav-group">
          <button>About</button>
          <div className="dropdown">
            <a href="#parents">Why CourtStreak</a>
            <a href="#reviews">Testimonials</a>
          </div>
        </div>
      </div>

      <a className="nav-cta" href="#download">Download</a>
    </nav>
  );
}
