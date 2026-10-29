import React from 'react';
import { Link } from 'react-router-dom';
export default function Footer() {
  return <footer className="cs-public-footer"><strong>CourtStreak</strong><nav aria-label="Footer"><Link to="/preview">Preview</Link><Link to="/login">Log in</Link><Link to="/pricing">Membership</Link><Link to="/contact">Help</Link><Link to="/about">About</Link></nav><span>One rep at a time.</span></footer>;
}
