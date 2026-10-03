// Prayer time calculation (fallback when Awqaf times are not imported)
const rad=d=>d*Math.PI/180, deg=r=>r*180/Math.PI;
function sunPos(jd){const D=jd-2451545.0,g=(357.529+0.98560028*D)%360,q=(280.459+0.98564736*D)%360,
 L=(q+1.915*Math.sin(rad(g))+0.020*Math.sin(rad(2*g)))%360,e=23.439-0.00000036*D,
 RA=deg(Math.atan2(Math.cos(rad(e))*Math.sin(rad(L)),Math.cos(rad(L))))/15,
 decl=deg(Math.asin(Math.sin(rad(e))*Math.sin(rad(L))));let EqT=q/15-((RA%24)+24)%24;EqT=((EqT+12)%24+24)%24-12;return{decl,EqT};}
function julian(y,m,d){if(m<=2){y-=1;m+=12}const A=Math.floor(y/100),B=2-A+Math.floor(A/4);return Math.floor(365.25*(y+4716))+Math.floor(30.6001*(m+1))+d+B-1524.5;}
export function calcTimes(dateStr,{lat=25.3463,lng=55.4209,tz=4,fajr=18.2,isha=18.2,adj={sunrise:-3.4,maghrib:2,isha:-0.6,dhuhr:0.4}}={}){
 const [y,m,d]=dateStr.split('-').map(Number);const jd=julian(y,m,d)-lng/(15*24);
 const mid=t=>{const {EqT}=sunPos(jd+t);return 12-EqT;};
 const angleT=(a,t,ccw)=>{const {decl}=sunPos(jd+t);const n=-Math.sin(rad(a))-Math.sin(rad(decl))*Math.sin(rad(lat));const dd=Math.cos(rad(decl))*Math.cos(rad(lat));const h=deg(Math.acos(Math.max(-1,Math.min(1,n/dd))))/15;return mid(t)+(ccw?-h:h);};
 const asrT=t=>{const {decl}=sunPos(jd+t);const a=-deg(Math.atan(1/(1+Math.tan(rad(Math.abs(lat-decl))))));return angleT(a,t,false);};
 let T={fajr:5/24,sunrise:6/24,dhuhr:12/24,asr:13/24,maghrib:18/24,isha:18/24};
 for(let i=0;i<2;i++){T={fajr:angleT(fajr,T.fajr,true)/24,sunrise:angleT(0.833,T.sunrise,true)/24,dhuhr:mid(T.dhuhr)/24,asr:asrT(T.asr)/24,maghrib:angleT(0.833,T.maghrib,false)/24,isha:angleT(isha,T.isha,false)/24};}
 const out={};const base={dhuhr:2,maghrib:1};
 for(const k in T){let h=T[k]*24+tz-lng/15+(base[k]||0)/60+(adj[k]||0)/60;const mins=Math.round(h*60);out[k]=String(Math.floor(mins/60)%24).padStart(2,'0')+':'+String(mins%60).padStart(2,'0');}
 return out;}
