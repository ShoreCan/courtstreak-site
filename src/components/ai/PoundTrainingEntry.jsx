import React from 'react';
import {FiArrowUpRight,FiCamera} from 'react-icons/fi';
import {useAppearance} from '../AppearanceControl.jsx';
import '../../cs-mobile-drill-fix.css';
import './pound-entry-studio.css';

export default function PoundTrainingEntry({onCamera,onManual}){
 const appearance=useAppearance();
 return <section className="cs-iphone-entry-card cs-entry-studio" data-appearance={appearance} aria-label="Choose your tracking method">
  <div className="cs-iphone-entry-heading">
   <span className="cs-iphone-entry-kicker"><FiCamera/> AI TRAINING</span>
   <strong>Your reps. Your replay.</strong>
   <p>20 seconds. Live counting. Every rep on replay.</p>
  </div>
  <button className="cs-iphone-entry-ai" type="button" onClick={onCamera}><span><b>Open AI tracker</b></span><FiArrowUpRight aria-hidden="true"/></button>
  <button className="cs-iphone-entry-manual" type="button" onClick={onManual}><span><b>Use a timer instead</b></span><FiArrowUpRight aria-hidden="true"/></button>
  <small className="cs-iphone-entry-disclaimer">AI preview · Review your count. No XP or Circle score is posted.</small>
 </section>;
}
