import React,{useId,useState} from 'react';
import {Link} from 'react-router-dom';
import {FiEye,FiEyeOff} from 'react-icons/fi';
import './auth-simple.css';

export default function AuthShell({title,children}){
 return <main className="cs-auth-simple"><div className="cs-auth-simple-wrap"><Link to="/" className="cs-auth-simple-brand"><span aria-hidden="true">CS</span>CourtStreak</Link><section className="cs-auth-simple-card"><h1>{title}</h1>{children}</section><Link className="cs-auth-simple-help" to="/contact">Need help?</Link></div></main>;
}
export function PasswordField({label='Password',...props}){
 const [visible,setVisible]=useState(false),generated=useId(),id=props.id||generated;
 return <div className="cs-auth-simple-field"><label htmlFor={id}>{label}</label><div className="cs-password-field"><input {...props} id={id} type={visible?'text':'password'}/><button type="button" aria-label={(visible?'Hide ':'Show ')+label.toLowerCase()} aria-pressed={visible} onClick={()=>setVisible(value=>!value)}>{visible?<FiEyeOff/>:<FiEye/>}</button></div></div>;
}
