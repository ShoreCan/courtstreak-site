import React from 'react';
import { Link } from 'react-router-dom';
import {ArrowRight} from 'lucide-react';
import ProgressPreview from './ProgressPreview.jsx';
import FriendChallengePreview from './FriendChallengePreview.jsx';

export default function ProgressCommunity() {
  return (
 <section
  id="community"
  className="section cs-progress-community"
>
      <div className="cs-progress-community-glow" />

      <div className="cs-progress-community-heading">
        <p className="eyebrow">PROGRESS YOU CAN SEE</p>

        <h2>
          See your work pay off.
        </h2>

        <p>
          Personal bests. Private Circles. Progress you can see.
          Sample results shown below.
        </p>
      </div>

      <div className="cs-progress-community-grid">
        <ProgressPreview/>
        <FriendChallengePreview/>
      </div>

     <div className="cs-progress-community-cta">
  <div>
    <span>READY TO BUILD YOUR STREAK?</span>

    <h3>Train with purpose. Improve together.</h3>

    <p>
      Choose a drill and make your next rep count.
    </p>
  </div>

  <div>
    <Link to="/create-account">
      Create Your Account
      <ArrowRight size={18} />
    </Link>

    <small>$29.99/month • Manage or cancel anytime</small>
  </div>
</div>
</section>
);
}