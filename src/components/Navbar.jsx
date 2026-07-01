import React, { useState } from 'react';

const menus = [
  { title: 'Membership', links: [['Pricing', '#pricing'], ['What’s Included', '#pricing'], ['Join Beta', '#join'], ['FAQ', '#faq']] },
  { title: 'For Groups', links: [['Players', '#parents'], ['Parents', '#parents'], ['Coaches', '#challenge'], ['AAU Teams', '#challenge'], ['Training Circles', '#challenge']] },
  { title: 'Support', links: [['FAQ', '#faq'], ['Reviews', '#reviews'], ['Contact', '#join']] },
  { title: 'Company', links: [['Mission', '#parents'], ['Testimonials', '#reviews'], ['Founder Story', '#parents']] },
  { title: 'Training', links: [['Daily Workouts', '#top'], ['Challenges', '#challenge'], ['Leaderboards', '#challenge'], ['XP & Badges', '#top']] },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="nav premium-nav">
      <a className="brand" href="#top">
        <span className="brand-mark">CS</span>
        <span>CourtStreak</span>
      </a>

      <div className="premium-menu">
        {menus.map((menu) => (
          <div className="premium-menu-item" key={menu.title}>
            <button type="button">{menu.title}</button>
            <div className="premium-dropdown">
              {menu.links.map(([label, href]) => (
                <a href={href} key={label}>{label}</a>
              ))}
            </div>
          </div>
        ))}
      </div>

      <a className="nav-cta desktop-cta" href="#join">Join Beta</a>

      <button className="hamburger" type="button" onClick={() => setOpen(!open)}>
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
                <a href={href} key={label} onClick={() => setOpen(false)}>{label}</a>
              ))}
            </details>
          ))}
          <a className="mobile-join" href="#join" onClick={() => setOpen(false)}>Join Beta</a>
        </div>
      )}
    </nav>
  );
}
