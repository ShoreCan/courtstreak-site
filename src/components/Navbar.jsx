import React, { useState } from 'react';

const HOME = '/courtstreak-site/';

const menus = [
  {
    title: 'Membership',
    links: [
      ['Pricing', `${HOME}#pricing`],
      ['What’s Included', `${HOME}#included`],
      ['Join Beta', `${HOME}#join`],
      ['FAQ', `${HOME}#faq`],
    ],
  },
  {
    title: 'For Groups',
    links: [
      ['Players', `${HOME}#players`],
      ['Parents', `${HOME}#parents`],
      ['Coaches', `${HOME}#coach-dashboard`],
      ['AAU Teams', `${HOME}#challenge`],
      ['Training Circles', `${HOME}#challenge`],
    ],
  },
  {
    title: 'Training',
    links: [
      ['Ball Handling', '/courtstreak-site/training/ball-handling'],
      ['Beginner Path', '/courtstreak-site/training/ball-handling'],
      ['Intermediate Path', '/courtstreak-site/training/ball-handling'],
      ['Advanced Path', '/courtstreak-site/training/ball-handling'],
    ],
  },
  {
    title: 'Support',
    links: [
      ['FAQ', `${HOME}#faq`],
      ['Reviews', `${HOME}#reviews`],
      ['Contact', `${HOME}#contact`],
    ],
  },
  {
    title: 'Company',
    links: [
      ['Mission', `${HOME}#mission`],
      ['Testimonials', `${HOME}#reviews`],
      ['Founder Story', `${HOME}#parents`],
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
                <a href={href} key={label}>{label}</a>
              ))}
            </div>
          </div>
        ))}
      </div>

      <a className="nav-cta desktop-cta" href={`${HOME}#join`}>Join Beta</a>

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
          <a className="mobile-join" href={`${HOME}#join`} onClick={() => setOpen(false)}>Join Beta</a>
        </div>
      )}
    </nav>
  );
}
