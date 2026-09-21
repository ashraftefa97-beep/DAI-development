import { useEffect, useRef, useState } from 'react';
type ResultEvent = { results: ArrayLike<ArrayLike<{transcript:string}>> };
type Recognition = {
  lang:string; interimResults:boolean; continuous:boolean;
  onresult:((event:ResultEvent)=>void)|null; onerror:((event:{error:string})=>void)|null;
  onend:(()=>void)|null; start:()=>void; stop:()=>void; abort:()=>void;
};
type SpeechWindow = Window & {SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition};
export function useMicrophone(onText:(text:string)=>void,onError:(text:string)=>void) {
  const [listening,setListening]=useState(false);
  const [supported,setSupported]=useState(false);
  const recognition=useRef<Recognition|null>(null);
  const textRef=useRef(onText),errorRef=useRef(onError);
  textRef.current=onText;errorRef.current=onError;
  const stop=()=>{ const r=recognition.current;recognition.current=null;if(r){r.onresult=null;r.onerror=null;r.onend=null;r.abort();}setListening(false); };
  useEffect(()=>{
    const host=window as SpeechWindow;
    setSupported(!!(host.SpeechRecognition||host.webkitSpeechRecognition));
    return ()=>{const r=recognition.current;if(r){r.onresult=null;r.onerror=null;r.onend=null;r.abort();}};
  },[]);
  function toggle() {
    if(recognition.current){recognition.current.stop();return;}
    const host=window as SpeechWindow,Ctor=host.SpeechRecognition||host.webkitSpeechRecognition;
    if(!Ctor){errorRef.current('المتصفح ده مش بيدعم الإملاء الصوتي. تقدر تكتب.');return;}
    const r=new Ctor();recognition.current=r;r.lang='ar-EG';r.interimResults=false;r.continuous=false;
    r.onresult=event=>{const text=Array.from(event.results).map(result=>result[0].transcript).join(' ').trim();if(text)textRef.current(text);};
    r.onerror=event=>{errorRef.current(event.error==='not-allowed'?'اسمح باستخدام الميكروفون من إعدادات المتصفح.':'تعذر التقاط الصوت. تقدر تكتب أو تحاول تاني.');};
    r.onend=()=>{recognition.current=null;setListening(false);};
    try{r.start();setListening(true);}catch{recognition.current=null;setListening(false);errorRef.current('تعذر تشغيل الميكروفون.');}
  }
  return {listening,supported,toggle,stop};
}
