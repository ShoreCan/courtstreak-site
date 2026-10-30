import React from 'react';
import {Link} from 'react-router-dom';
import {ArrowUpRight,Camera,Download} from 'lucide-react';
import {CameraTrainingVisual} from './ProductVisuals.jsx';

export default function AITrainingShowcase(){
 return <section id="ai-training" className="cs-ai-showcase" aria-labelledby="cs-ai-showcase-title">
  <div className="cs-ai-showcase-copy">
   <p className="cs-product-eyebrow"><Camera size={15}/>AI TRAINING, IN FOCUS</p>
   <h2 id="cs-ai-showcase-title">Your camera.<br/><span>Your rep counter.</span></h2>
   <p>Choose AI Camera before your round. Let the tracker count your dribbles while you focus on your handle.</p>
   <div className="cs-ai-benefits">
    <div><Camera size={19}/><div><strong>Stay in your rhythm.</strong><p>Automatic rep counting, followed by a replay you can review.</p></div></div>
    <div><Download size={19}/><div><strong>Keep the video. See the difference.</strong><p>Save your finished round to your camera roll. Rewatch it yourself a week or two later to see how far you’ve come.</p></div></div>
   </div>
   <Link className="cs-product-primary" to="/preview/lab/drill/right-hand-pound">See the AI option<ArrowUpRight size={18}/></Link>
   <small>Right-hand pound AI preview · Review your count.</small>
  </div>
  <CameraTrainingVisual/>
 </section>;
}
