import React from 'react';
import SitePage from '../components/SitePage.jsx';
import { SupporterPromo } from '../components/PreviewWelcome.jsx';
export default function Parents() {
  return <SitePage themeClass="cs-supporter-page" eyebrow="FOR PARENTS" title="See Their Effort. Support Their Growth." intro="A clear view of your child’s practice, scores, and assigned work. Your own account. Their own training." primaryLabel="Explore Family Hub" primaryHref="/courtstreak-site/preview/hub?view=parent" secondaryLabel="Create a Parent Account" secondaryHref="/courtstreak-site/create-account?role=parent" finalEyebrow="PLAYER-APPROVED ACCESS" finalTitle="Your account. Their progress. A clear connection." finalText="Start with a sample preview. Real progress appears after a player invites you and you accept. Players train on their own accounts; parents and coaches support and oversee the work." finalButtonLabel="Explore Family Hub" finalButtonHref="/courtstreak-site/preview/hub?view=parent">
    <SupporterPromo role="parent" />
  </SitePage>;
}
