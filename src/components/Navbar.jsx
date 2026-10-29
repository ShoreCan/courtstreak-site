import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import '../public-preview-entry.css';

const HOME = '/courtstreak-site/';

const menus = [
  { title: 'Training', links: [
    ['Ball handling', '/courtstreak-site/training/ball-handling'],
    ['What’s included', '/courtstreak-site/whats-included'],
    ['Membership', '/courtstreak-site/pricing'],
  ]},
  { title: 'Parents & coaches', links: [
    ['For parents', '/courtstreak-site/parents'],
    ['For coaches', '/courtstreak-site/coaches'],
    ['Open your Hub', '/courtstreak-site/hub'],
  ]},
  { title: 'Help', links: [
    ['Quick answers', '/courtstreak-site/faq'],
    ['Contact support', '/courtstreak-site/contact'],
  ]},
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="nav premium-nav">
      <a className="brand" href={HOME}>
        <span className="brand-mark">CS</span>
        <span>CourtStreak</span>
      </a>

      <div className="premium-menu">
        <Link className="cs-public-nav-preview" to="/preview">Preview</Link>
        {menus.map((menu) => (
          <details className="premium-menu-item" key={menu.title} onKeyDown={event => { if (event.key === 'Escape') { event.currentTarget.open = false; event.currentTarget.querySelector('summary').focus(); } }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false; }}>
            <summary>{menu.title}</summary>
            <div className="premium-dropdown">
              {menu.links.map(([label, href]) => (
                <a href={href} key={`${menu.title}-${label}`}>{label}</a>
              ))}
            </div>
          </details>
        ))}
      </div>

      <div className="nav-auth desktop-auth">
  <a className="nav-login" href="/courtstreak-site/login">
    Log In
  </a>

  <a className="nav-cta desktop-cta" href="/courtstreak-site/create-account">
    Create Account
  </a>
</div>

      <Link className="cs-public-mobile-login" to="/login">Log in</Link>
      <Link className="cs-public-mobile-preview" to="/preview">Preview</Link>

      <button
        className="hamburger"
        type="button"
        aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
        aria-controls="cs-public-mobile-menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
      </button>

      {open && (
        <div className="mobile-menu" id="cs-public-mobile-menu" onKeyDown={event => { if (event.key === 'Escape') { setOpen(false); event.currentTarget.closest('nav').querySelector('.hamburger').focus(); } }}>
          <Link className="cs-public-menu-preview" to="/preview" onClick={() => setOpen(false)}><strong>Explore CourtStreak →</strong><small>Free to explore · No account needed</small></Link>
          {menus.map((menu) => (
            <details className="mobile-menu-group" key={menu.title}>
              <summary>{menu.title}</summary>
              {menu.links.map(([label, href]) => (
                <a
                  href={href}
                  key={`${menu.title}-${label}`}
                  onClick={() => setOpen(false)}
                >
                  {label}
                </a>
              ))}
            </details>
          ))}
         <div className="mobile-auth">
  <a
    className="mobile-login"
    href="/courtstreak-site/login"
    onClick={() => setOpen(false)}
  >
    Log In
  </a>

  <a
    className="mobile-join"
    href="/courtstreak-site/create-account"
    onClick={() => setOpen(false)}
  >
    Create Account
  </a>
</div>
        </div>
      )}
    </nav>
  );
}
