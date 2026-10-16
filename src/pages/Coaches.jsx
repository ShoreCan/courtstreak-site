import React from 'react';
import SitePage from '../components/SitePage.jsx';
import { SupporterPromo } from '../components/PreviewWelcome.jsx';
export default function Coaches() {
  return <SitePage themeClass="cs-supporter-page" eyebrow="FOR COACHES" title="Know Who Puts In the Work." intro="See team completion, open individual progress, and assign purposeful workouts with clear deadlines." primaryLabel="Explore Team Hub" primaryHref="/courtstreak-site/preview/hub?view=coach" secondaryLabel="Create a Coach Account" secondaryHref="/courtstreak-site/create-account?role=coach" finalEyebrow="PLAYER-APPROVED ACCESS" finalTitle="Your account. Their progress. A clear connection." finalText="Start with a sample preview. Real progress appears after a player invites you and you accept. Players train on their own accounts; parents and coaches support and oversee the work." finalButtonLabel="Explore Team Hub" finalButtonHref="/courtstreak-site/preview/hub?view=coach">
    <SupporterPromo role="coach" />
  </SitePage>;
}
