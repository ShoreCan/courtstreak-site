import React from 'react';
import {Link} from 'react-router-dom';
import {ArrowUpRight,Camera,RotateCcw,ShieldCheck} from 'lucide-react';
import {CameraTrainingVisual} from './ProductVisuals.jsx';

export default function AITrainingShowcase(){
 return <section id="ai-training" className="cs-ai-showcase" aria-labelledby="cs-ai-showcase-title"><div className="cs-ai-showcase-copy"><p className="cs-product-eyebrow"><Camera size={15}/>AI TRAINING, IN FOCUS</p><h2 id="cs-ai-showcase-title">You bring the work.<br/><span>We count the reps.</span></h2><p>Set your phone down. Get in your rhythm. Let the AI camera count your dribbles, then review every counted rep.</p><div className="cs-ai-showcase-points"><span><Camera size={17}/>Live rep count</span><span><RotateCcw size={17}/>Tap-through replay</span><span><ShieldCheck size={17}/>Video stays on your device</span></div><Link className="cs-product-primary" to="/preview/ai-training">See AI training in action<ArrowUpRight size={18}/></Link><small>Right-hand pound available now in AI preview. Review your count.</small></div><CameraTrainingVisual/></section>;
}
