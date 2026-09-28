import React from 'react';
export const Input=({label,children})=><label className="ds-field"><span>{label}</span>{children}</label>;
export const Notice=({children,error=false})=><p className={'ds-note '+(error?'error':'')} role={error?'alert':'status'}>{children}</p>;
