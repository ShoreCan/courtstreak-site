import React from 'react';
import {Link} from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import {PreviewRoleCard} from '../components/PreviewWelcome.jsx';
import '../product-pages.css';

export default function HubAccess(){
 return <main className="cs-product-page"><Navbar/><section className="cs-hub-access"><p className="cs-product-eyebrow">YOUR PEOPLE. YOUR PERSPECTIVE.</p><h1>Your side of the game.</h1><p>Follow the effort, understand the progress, and help shape the next session.</p><div className="cs-hub-access-cards"><PreviewRoleCard role="parent"/><PreviewRoleCard role="coach"/></div><div className="cs-hub-access-login"><div><strong>Already part of CourtStreak?</strong><p>Log in to open your own Hub and connected players.</p></div><Link className="cs-product-secondary" to="/login?next=%2Fhub">Open my Hub →</Link></div></section><Footer/></main>;
}
