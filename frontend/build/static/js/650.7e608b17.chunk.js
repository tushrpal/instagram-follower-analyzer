"use strict";(self.webpackChunkinstagram_follower_analyzer_frontend=self.webpackChunkinstagram_follower_analyzer_frontend||[]).push([[650],{4650:(e,t,r)=>{r.r(t),r.d(t,{Account:()=>te});var a=r(5043),s=r(8729),o=r(6339),i=r(987),n=r(6213);let l={data:""},d=e=>{if("object"==typeof window){let t=(e?e.querySelector("#_goober"):window._goober)||Object.assign(document.createElement("style"),{innerHTML:" ",id:"_goober"});return t.nonce=window.__nonce__,t.parentNode||(e||document.head).appendChild(t),t.firstChild}return e||l},c=/(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g,p=/\/\*[^]*?\*\/|  +/g,m=/\n+/g,u=(e,t)=>{let r="",a="",s="";for(let o in e){let i=e[o];"@"==o[0]?"i"==o[1]?r=o+" "+i+";":a+="f"==o[1]?u(i,o):o+"{"+u(i,"k"==o[1]?"":t)+"}":"object"==typeof i?a+=u(i,t?t.replace(/([^,])+/g,e=>o.replace(/([^,]*:\S+\([^)]*\))|([^,])+/g,t=>/&/.test(t)?t.replace(/&/g,e):e?e+" "+t:t)):o):null!=i&&(o="-"==o[1]?o:o.replace(/[A-Z]/g,"-$&").toLowerCase(),s+=u.p?u.p(o,i):o+":"+i+";")}return r+(t&&s?t+"{"+s+"}":s)+a},x={},g=e=>{if("object"==typeof e){let t="";for(let r in e)t+=r+g(e[r]);return t}return e},h=(e,t,r,a,s)=>{let o=g(e),i=x[o]||(x[o]=(e=>{let t=0,r=11;for(;t<e.length;)r=101*r+e.charCodeAt(t++)>>>0;return"go"+r})(o));if(!x[i]){let t=o!==e?e:(e=>{let t,r,a=[{}];for(;t=c.exec(e.replace(p,""));)t[4]?a.shift():t[3]?(r=t[3].replace(m," ").trim(),a.unshift(a[0][r]=a[0][r]||{})):a[0][t[1]]=t[2].replace(m," ").trim();return a[0]})(e);x[i]=u(s?{["@keyframes "+i]:t}:t,r?"":"."+i)}let n=r&&x.g;return r&&(x.g=x[i]),((e,t,r,a)=>{a?t.data=t.data.replace(a,e):-1===t.data.indexOf(e)&&(t.data=r?e+t.data:t.data+e)})(x[i],t,a,n),i};function y(e){let t=this||{},r=e.call?e(t.p):e;return h(r.unshift?r.raw?((e,t,r)=>e.reduce((e,a,s)=>{let o=t[s];if(o&&o.call){let e=o(r),t=e&&e.props&&e.props.className||/^go/.test(e)&&e;o=t?"."+t:e&&"object"==typeof e?e.props?"":u(e,""):!1===e?"":e}return e+a+(null==o?"":o)},""))(r,[].slice.call(arguments,1),t.p):r.reduce((e,r)=>Object.assign(e,r&&r.call?r(t.p):r),{}):r,d(t.target),t.g,t.o,t.k)}y.bind({g:1});let f,b,v,w=y.bind({k:1});function j(e,t){let r=this||{};return function(){let a=arguments;function s(o,i){let n=Object.assign({},o),l=n.className||s.className;r.p=Object.assign({theme:b&&b()},n),r.o=/go\d/.test(l),n.className=y.apply(r,a)+(l?" "+l:""),t&&(n.ref=i);let d=e;return e[0]&&(d=n.as||e,delete n.as),v&&d[0]&&v(n),f(d,n)}return t?t(s):s}}var k=(e,t)=>(e=>"function"==typeof e)(e)?e(t):e,N=(()=>{let e=0;return()=>(++e).toString()})(),A=(()=>{let e;return()=>{if(void 0===e&&typeof window<"u"){let t=matchMedia("(prefers-reduced-motion: reduce)");e=!t||t.matches}return e}})(),$="default",E=(e,t)=>{let{toastLimit:r}=e.settings;switch(t.type){case 0:return{...e,toasts:[t.toast,...e.toasts].slice(0,r)};case 1:return{...e,toasts:e.toasts.map(e=>e.id===t.toast.id?{...e,...t.toast}:e)};case 2:let{toast:a}=t;return E(e,{type:e.toasts.find(e=>e.id===a.id)?1:0,toast:a});case 3:let{toastId:s}=t;return{...e,toasts:e.toasts.map(e=>e.id===s||void 0===s?{...e,dismissed:!0,visible:!1}:e)};case 4:return void 0===t.toastId?{...e,toasts:[]}:{...e,toasts:e.toasts.filter(e=>e.id!==t.toastId)};case 5:return{...e,pausedAt:t.time};case 6:let o=t.time-(e.pausedAt||0);return{...e,pausedAt:void 0,toasts:e.toasts.map(e=>({...e,pauseDuration:e.pauseDuration+o}))}}},S=[],C={toasts:[],pausedAt:void 0,settings:{toastLimit:20}},_={},D=function(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:$;_[t]=E(_[t]||C,e),S.forEach(e=>{let[r,a]=e;r===t&&a(_[t])})},z=e=>Object.keys(_).forEach(t=>D(e,t)),I=function(){let e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:$;return t=>{D(t,e)}},F=e=>(t,r)=>{let a=function(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"blank",r=arguments.length>2?arguments[2]:void 0;return{createdAt:Date.now(),visible:!0,dismissed:!1,type:t,ariaProps:{role:"status","aria-live":"polite"},message:e,pauseDuration:0,...r,id:(null==r?void 0:r.id)||N()}}(t,e,r);return I(a.toasterId||(e=>Object.keys(_).find(t=>_[t].toasts.some(t=>t.id===e)))(a.id))({type:2,toast:a}),a.id},L=(e,t)=>F("blank")(e,t);L.error=F("error"),L.success=F("success"),L.loading=F("loading"),L.custom=F("custom"),L.dismiss=(e,t)=>{let r={type:3,toastId:e};t?I(t)(r):z(r)},L.dismissAll=e=>L.dismiss(void 0,e),L.remove=(e,t)=>{let r={type:4,toastId:e};t?I(t)(r):z(r)},L.removeAll=e=>L.remove(void 0,e),L.promise=(e,t,r)=>{let a=L.loading(t.loading,{...r,...null==r?void 0:r.loading});return"function"==typeof e&&(e=e()),e.then(e=>{let s=t.success?k(t.success,e):void 0;return s?L.success(s,{id:a,...r,...null==r?void 0:r.success}):L.dismiss(a),e}).catch(e=>{let s=t.error?k(t.error,e):void 0;s?L.error(s,{id:a,...r,...null==r?void 0:r.error}):L.dismiss(a)}),e};var M=w`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
 transform: scale(1) rotate(45deg);
  opacity: 1;
}`,O=w`
from {
  transform: scale(0);
  opacity: 0;
}
to {
  transform: scale(1);
  opacity: 1;
}`,P=w`
from {
  transform: scale(0) rotate(90deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(90deg);
	opacity: 1;
}`,T=j("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#ff4b4b"};
  position: relative;
  transform: rotate(45deg);

  animation: ${M} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;

  &:after,
  &:before {
    content: '';
    animation: ${O} 0.15s ease-out forwards;
    animation-delay: 150ms;
    position: absolute;
    border-radius: 3px;
    opacity: 0;
    background: ${e=>e.secondary||"#fff"};
    bottom: 9px;
    left: 4px;
    height: 2px;
    width: 12px;
  }

  &:before {
    animation: ${P} 0.15s ease-out forwards;
    animation-delay: 180ms;
    transform: rotate(90deg);
  }
`,q=w`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`,H=j("div")`
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  border: 2px solid;
  border-radius: 100%;
  border-color: ${e=>e.secondary||"#e0e0e0"};
  border-right-color: ${e=>e.primary||"#616161"};
  animation: ${q} 1s linear infinite;
`,V=w`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(45deg);
	opacity: 1;
}`,Z=w`
0% {
	height: 0;
	width: 0;
	opacity: 0;
}
40% {
  height: 0;
	width: 6px;
	opacity: 1;
}
100% {
  opacity: 1;
  height: 10px;
}`,R=j("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#61d345"};
  position: relative;
  transform: rotate(45deg);

  animation: ${V} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;
  &:after {
    content: '';
    box-sizing: border-box;
    animation: ${Z} 0.2s ease-out forwards;
    opacity: 0;
    animation-delay: 200ms;
    position: absolute;
    border-right: 2px solid;
    border-bottom: 2px solid;
    border-color: ${e=>e.secondary||"#fff"};
    bottom: 6px;
    left: 6px;
    height: 10px;
    width: 6px;
  }
`,Y=j("div")`
  position: absolute;
`,B=j("div")`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 20px;
  min-height: 20px;
`,G=w`
from {
  transform: scale(0.6);
  opacity: 0.4;
}
to {
  transform: scale(1);
  opacity: 1;
}`,J=j("div")`
  position: relative;
  transform: scale(0.6);
  opacity: 0.4;
  min-width: 20px;
  animation: ${G} 0.3s 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
`,K=e=>{let{toast:t}=e,{icon:r,type:s,iconTheme:o}=t;return void 0!==r?"string"==typeof r?a.createElement(J,null,r):r:"blank"===s?null:a.createElement(B,null,a.createElement(H,{...o}),"loading"!==s&&a.createElement(Y,null,"error"===s?a.createElement(T,{...o}):a.createElement(R,{...o})))},Q=e=>`\n0% {transform: translate3d(0,${-200*e}%,0) scale(.6); opacity:.5;}\n100% {transform: translate3d(0,0,0) scale(1); opacity:1;}\n`,U=e=>`\n0% {transform: translate3d(0,0,-1px) scale(1); opacity:1;}\n100% {transform: translate3d(0,${-150*e}%,-1px) scale(.6); opacity:0;}\n`,W=j("div")`
  display: flex;
  align-items: center;
  background: #fff;
  color: #363636;
  line-height: 1.3;
  will-change: transform;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1), 0 3px 3px rgba(0, 0, 0, 0.05);
  max-width: 350px;
  pointer-events: auto;
  padding: 8px 10px;
  border-radius: 8px;
`,X=j("div")`
  display: flex;
  justify-content: center;
  margin: 4px 10px;
  color: inherit;
  flex: 1 1 auto;
  white-space: pre-line;
`;a.memo(e=>{let{toast:t,position:r,style:s,children:o}=e,i=t.height?((e,t)=>{let r=e.includes("top")?1:-1,[a,s]=A()?["0%{opacity:0;} 100%{opacity:1;}","0%{opacity:1;} 100%{opacity:0;}"]:[Q(r),U(r)];return{animation:t?`${w(a)} 0.35s cubic-bezier(.21,1.02,.73,1) forwards`:`${w(s)} 0.4s forwards cubic-bezier(.06,.71,.55,1)`}})(t.position||r||"top-center",t.visible):{opacity:0},n=a.createElement(K,{toast:t}),l=a.createElement(X,{...t.ariaProps},k(t.message,t));return a.createElement(W,{className:t.className,style:{...i,...s,...t.style}},"function"==typeof o?o({icon:n,message:l}):a.createElement(a.Fragment,null,n,l))});!function(e,t,r,a){u.p=t,f=e,b=r,v=a}(a.createElement);y`
  z-index: 9999;
  > * {
    pointer-events: auto;
  }
`;var ee=r(579);function te(){const{user:e,logout:t}=(0,s.A)(),[r,l]=(0,a.useState)(""),[d,c]=(0,a.useState)(null),[p,m]=(0,a.useState)(!1),[u,x]=(0,a.useState)([]),[g,h]=(0,a.useState)(!0);(0,a.useEffect)(()=>{e&&y()},[e]);const y=async()=>{try{h(!0);const{data:e}=await n.A.get("/api/sessions");x(e)}catch(d){L.error("Failed to load active sessions."),console.error(d)}finally{h(!1)}};return void 0===e?(0,ee.jsx)("div",{children:"Loading..."}):e?(0,ee.jsxs)("div",{className:"max-w-4xl mx-auto py-8 px-4",children:[(0,ee.jsxs)("div",{className:"text-center mb-8",children:[(0,ee.jsx)("h1",{className:"text-3xl font-bold text-gray-900 dark:text-white mb-2",children:"My Account"}),(0,ee.jsx)("p",{className:"text-gray-600 dark:text-gray-400",children:"Manage your account settings and data."})]}),(0,ee.jsxs)("div",{className:"bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-8",children:[(0,ee.jsx)("h2",{className:"text-xl font-bold text-gray-900 dark:text-white mb-4",children:"Account Information"}),(0,ee.jsxs)("p",{className:"text-gray-700 dark:text-gray-300",children:[(0,ee.jsx)("strong",{children:"Email:"})," ",e.email]})]}),(0,ee.jsxs)("div",{className:"bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-8",children:[(0,ee.jsx)("h2",{className:"text-xl font-bold text-gray-900 dark:text-white mb-4",children:"Active Sessions"}),g?(0,ee.jsx)("p",{children:"Loading sessions..."}):(0,ee.jsx)("div",{className:"overflow-x-auto",children:(0,ee.jsxs)("table",{className:"min-w-full text-sm text-left",children:[(0,ee.jsx)("thead",{className:"bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300",children:(0,ee.jsxs)("tr",{children:[(0,ee.jsx)("th",{className:"py-3 px-4 font-semibold",children:"Device"}),(0,ee.jsx)("th",{className:"py-3 px-4 font-semibold",children:"IP Address"}),(0,ee.jsx)("th",{className:"py-3 px-4 font-semibold",children:"Signed In"}),(0,ee.jsx)("th",{className:"py-3 px-4 font-semibold",children:"Expires"}),(0,ee.jsx)("th",{className:"py-3 px-4 font-semibold"})]})}),(0,ee.jsx)("tbody",{className:"text-gray-700 dark:text-gray-300",children:u.map(e=>(0,ee.jsxs)("tr",{className:"border-b dark:border-gray-700",children:[(0,ee.jsx)("td",{className:"py-3 px-4 truncate",title:e.userAgent,children:e.userAgent?`${e.userAgent.substring(0,40)}...`:"N/A"}),(0,ee.jsx)("td",{className:"py-3 px-4",children:e.ip}),(0,ee.jsx)("td",{className:"py-3 px-4",children:new Date(e.createdAt).toLocaleString()}),(0,ee.jsx)("td",{className:"py-3 px-4",children:new Date(e.expiresAt).toLocaleString()}),(0,ee.jsx)("td",{className:"py-3 px-4 text-right",children:e.isCurrent?(0,ee.jsx)("span",{className:"font-bold text-green-600 dark:text-green-400 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30",children:"Current"}):(0,ee.jsx)("button",{onClick:()=>(async e=>{if(window.confirm("Are you sure you want to revoke this session? This will sign out the selected device."))try{await n.A.delete(`/api/sessions/${e}`),L.success("Session revoked successfully."),y()}catch(d){L.error("Failed to revoke session."),console.error(d)}})(e.sid),className:"font-semibold text-red-500 hover:text-red-700",children:"Revoke"})})]},e.sid))})]})})]}),(0,ee.jsxs)("div",{className:"bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border-2 border-red-200 dark:border-red-800",children:[(0,ee.jsx)("h2",{className:"text-xl font-bold text-red-600 dark:text-red-400 mb-2",children:"Danger Zone"}),(0,ee.jsx)("p",{className:"text-gray-600 dark:text-gray-400 mb-6",children:"This action is irreversible. Deleting your account will permanently remove all your saved analysis sessions, notes, and personal information."}),p?(0,ee.jsxs)("form",{onSubmit:async e=>{e.preventDefault(),c(null);try{await n.A.post("/api/auth/delete-account",{password:r}),await t(),L.success("Account deleted successfully.")}catch(o){var a,s;c((null===(a=o.response)||void 0===a||null===(s=a.data)||void 0===s?void 0:s.error)||"Failed to delete account.")}},children:[(0,ee.jsx)("p",{className:"font-semibold text-gray-800 dark:text-gray-200 mb-2",children:"Enter your password to confirm deletion:"}),(0,ee.jsx)("input",{type:"password",value:r,onChange:e=>l(e.target.value),required:!0,className:"w-full max-w-sm px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4",placeholder:"Password"}),d&&(0,ee.jsxs)("div",{className:"my-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-sm text-red-700 dark:text-red-400",children:[(0,ee.jsx)(i.A,{className:"w-4 h-4"})," ",d]}),(0,ee.jsxs)("div",{className:"flex items-center gap-4",children:[(0,ee.jsx)("button",{type:"submit",className:"px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors",children:"Permanently Delete"}),(0,ee.jsx)("button",{type:"button",onClick:()=>{m(!1),c(null),l("")},className:"text-gray-600 dark:text-gray-400 hover:underline",children:"Cancel"})]})]}):(0,ee.jsxs)("button",{onClick:()=>m(!0),className:"px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors inline-flex items-center gap-2",children:[(0,ee.jsx)(o.A,{className:"w-4 h-4"}),"Delete My Account"]})]})]}):(0,ee.jsx)("div",{className:"max-w-md mx-auto text-center py-16",children:(0,ee.jsx)("p",{className:"text-gray-600 dark:text-gray-400",children:"You must be logged in to manage your account."})})}},6339:(e,t,r)=>{r.d(t,{A:()=>a});const a=(0,r(3797).A)("Trash2",[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]])}}]);
//# sourceMappingURL=650.7e608b17.chunk.js.map