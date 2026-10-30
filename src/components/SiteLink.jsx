import React from 'react';
import {Link} from 'react-router-dom';

export default function SiteLink({href,children,...props}){
 const internal=href?.startsWith('/courtstreak-site')?href.slice('/courtstreak-site'.length)||'/':href;
 return internal&&(internal.startsWith('/')&&!internal.startsWith('//')||internal.startsWith('#'))?<Link to={internal} {...props}>{children}</Link>:<a href={href} {...props}>{children}</a>;
}
