import React, { useState } from 'react';

const HOME = '/courtstreak-site/';

const menus = [
  {
    title: 'Membership',
    links: [
      ['Pricing', '/courtstreak-site/pricing'],
      ['What’s Included', `${HOME}#included`],
      ['Create Account', `${HOME}#join`],
      ['FAQ', '/courtstreak-site/faq'],
    ],
  },
  {
    title: 'For Groups',
    links: [
      ['Players', '/courtstreak-site/players'],
      ['Parents', '/courtstreak-site/parents'],
      ['Coaches', '/courtstreak-site/coaches'],
      ['AAU Teams', '/courtstreak-site/coaches'],
      ['Training Circles', `${HOME}#challenge`],
    ],
  },
  {
    title: 'Training',
    links: [
      ['Ball Handling', '/courtstreak-site/training/ball-handling'],
      ['Player Development', '/courtstreak-site/players'],
      ['Personalized Plans', '/courtstreak-site/players'],
      ['Live Coaching Support', '/courtstreak-site/players'],
    ],
  },
  {
    title: 'Support',
    links: [
      ['FAQ', '/courtstreak-site/faq'],
      ['Reviews', '/courtstreak-site/reviews'],
      ['Contact', `${HOME}#contact`],
    ],
  },
  {
    title: 'Company',
    links: [
      ['Mission', `${HOME}#mission`],
      ['Reviews', '/courtstreak-site/reviews'],
      ['Founder Story', '/courtstreak-site/about'],
    ],
  },
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
        {menus.map((menu) => (
          <div className="premium-menu-item" key={menu.title}>
            <button type="button">{menu.title}</button>
            <div className="premium-dropdown">
              {menu.links.map(([label, href]) => (
                <a href={href} key={`${menu.title}-${label}`}>{label}</a>
              ))}
            </div>
          </div>
        ))}
      </div>

      <a className="nav-cta desktop-cta" href={`${HOME}#join`}>Create Account</a>

      <button
        className="hamburger"
        type="button"
        aria-label="Open navigation menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      {open && (
        <div className="mobile-menu">
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
          <a
            className="mobile-join"
            href={`${HOME}#join`}
            onClick={() => setOpen(false)}
          >
            Create Account
          </a>
        </div>
      )}
    </nav>
  );
}
