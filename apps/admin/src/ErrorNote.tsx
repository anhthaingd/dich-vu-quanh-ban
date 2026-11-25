import type {ReactNode} from 'react';
import {errorReference,errorText,referenceText,type ErrorInfo,type PanelText} from './errors';
/** Precise error line, translated at render, plus a reference code for unexpected server failures. */
export function ErrorNote({error,locale,panel,children}:{error:ErrorInfo|null|undefined;locale:string;panel?:PanelText;children?:ReactNode}){
 if(!error)return null;
 const reference=errorReference(error);
 return <p role="alert">{errorText(locale,error,panel)}{reference&&<> <small className="reference">{referenceText(locale,reference)}</small></>}{children&&<> {children}</>}</p>;
}
