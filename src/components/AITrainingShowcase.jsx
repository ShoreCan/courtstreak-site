import React from 'react';
import {Link} from 'react-router-dom';
import {ArrowUpRight,Camera,Video,Users} from 'lucide-react';
import {CameraTrainingVisual} from './ProductVisuals.jsx';

export default function AITrainingShowcase(){
 return <section id="ai-training" className="cs-ai-showcase" aria-labelledby="cs-ai-showcase-title">
  <div className="cs-ai-showcase-copy">
   <p className="cs-product-eyebrow"><Camera size={15}/>AI TRAINING, IN FOCUS</p>
   <h2 id="cs-ai-showcase-title">Put in the reps.<br/><span>See the difference.</span></h2>
   <p>Choose AI Camera from your drill page. Set your phone down, find your rhythm, and watch your count build as you train.</p>
   <div className="cs-ai-benefits">
    <div><Camera size={19}/><div><strong>Feedback in the moment.</strong><p>Live counting and a replay of every counted rep.</p></div></div>
    <div><Video size={19}/><div><strong>Keep your starting point.</strong><p>Save videos to your device. Compare your first session with your work a week or two later.</p></div></div>
    <div><Users size={19}/><div><strong>Bring your people.</strong><p>Challenge friends in Training Circles. Keep each other showing up.</p></div></div>
   </div>
   <Link className="cs-product-primary" to="/preview/lab/drill/right-hand-pound">Explore the drill page<ArrowUpRight size={18}/></Link>
   <small>Right-hand pound AI preview · Review your count. AI rounds don’t post to Circle standings yet.</small>
  </div>
  <CameraTrainingVisual/>
 </section>;
}
