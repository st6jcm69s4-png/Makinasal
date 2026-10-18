'use client';
import { useEffect, useId, useMemo, useRef, useState, type ReactNode, type InputHTMLAttributes } from 'react';
import { matchingRanges, searchSuggestions, type SearchScope } from '@/lib/searchSuggestions';
import { useLanguage } from './LanguageProvider';
type Props={value:string;onValueChange:(value:string)=>void;scope?:SearchScope;city?:string;onNavigate?:()=>void}&Omit<InputHTMLAttributes<HTMLInputElement>,'value'|'onChange'|'list'|'role'>;
export function HighlightMatch({label,query}:{label:string;query:string}){
 const ranges=matchingRanges(label,query);let from=0;const parts:ReactNode[]=[];
 for(const range of ranges){if(range.start>from)parts.push(label.slice(from,range.start));parts.push(<mark key={range.start}>{label.slice(range.start,range.end)}</mark>);from=range.end;}
 if(from<label.length)parts.push(label.slice(from));return <>{parts}</>;
}
export function SearchAutocomplete({value,onValueChange,scope='all',city='',onNavigate,onKeyDown,onFocus,onBlur,...input}:Props){
 const {language,t}=useLanguage(),generatedId=useId(),listId=generatedId+'-suggestions';
 const wrapper=useRef<HTMLDivElement>(null),blurTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 const [open,setOpen]=useState(false),[active,setActive]=useState(-1);
 const suggestions=useMemo(()=>searchSuggestions(value,{language,scope,city}),[value,language,scope,city]);
 const visible=open&&value.trim().length>0;
 useEffect(()=>{setActive(-1);},[value,language,scope,city]);
 useEffect(()=>{if(active>=0&&visible)document.getElementById(listId+'-'+active)?.scrollIntoView({block:'nearest'});},[active,visible,listId]);
 useEffect(()=>{const outside=(event:PointerEvent)=>{if(!wrapper.current?.contains(event.target as Node))setOpen(false);};document.addEventListener('pointerdown',outside);return()=>{document.removeEventListener('pointerdown',outside);clearTimeout(blurTimer.current);};},[]);
 return <div className="search-autocomplete" ref={wrapper}>
  <input {...input} value={value} maxLength={input.maxLength??200} autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={visible} aria-controls={visible?listId:undefined} aria-activedescendant={visible&&active>=0&&active<suggestions.length?listId+'-'+active:undefined}
   onChange={event=>{onValueChange(event.target.value);setOpen(true);setActive(-1);}}
   onFocus={event=>{clearTimeout(blurTimer.current);setOpen(true);onFocus?.(event);}}
   onBlur={event=>{onBlur?.(event);blurTimer.current=setTimeout(()=>{if(!wrapper.current?.contains(document.activeElement))setOpen(false);},120);}}
   onKeyDown={event=>{if(event.nativeEvent.isComposing)return;
    if(event.key==='Escape'){setOpen(false);setActive(-1);event.preventDefault();event.stopPropagation();return;}
    if((event.key==='ArrowDown'||event.key==='ArrowUp')&&suggestions.length){event.preventDefault();setOpen(true);setActive(current=>event.key==='ArrowDown'?(current+1)%suggestions.length:(current<=0?suggestions.length-1:current-1));return;}
    if(event.key==='Enter'&&visible&&active>=0&&suggestions[active]){event.preventDefault();onNavigate?.();window.location.assign(suggestions[active].href);return;}
    onKeyDown?.(event);
   }}/>
  {visible&&<div className="search-suggestions"><p className="search-suggestions-title">{t('Önerilen filtreler')}</p>
   <ul id={listId} role="listbox" aria-label={t('Arama önerileri')}>{suggestions.map((item,index)=><li key={item.id} role="presentation"><a id={listId+'-'+index} role="option" aria-selected={active===index} href={item.href} tabIndex={-1} onPointerMove={()=>setActive(index)} onClick={()=>{clearTimeout(blurTimer.current);setOpen(false);onNavigate?.();}}><span className="suggestion-label"><HighlightMatch label={item.label} query={value}/></span><span className="suggestion-path"><span><HighlightMatch label={item.parent} query={value}/></span> <span aria-hidden="true">→</span></span></a></li>)}</ul>
   {!suggestions.length&&<p className="search-no-suggestions">{t('Uygun filtre bulunamadı. Yazdığın kelimeyle aramak için Enter’a bas veya Ara’ya dokun.')}</p>}
   <span className="sr" role="status">{t('{0} öneri',{'0':suggestions.length})}</span>
  </div>}
 </div>;
}
