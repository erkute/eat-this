import { CONSENT_VERSION, parseConsentCookie } from './consent';

export const CONSENT_INTERACTIVE_EVENT = 'eatthis:consent-interactive';
export const CONSENT_FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** The initial question must be usable while application JS is downloading.
 * Keep early intent in memory, then replay it through the original handlers.
 * This bootstrap never stores a choice or loads analytics. */
function createConsentBootstrap() {
  return `(function(){
    var pending=true,html=document.documentElement;
    try{
      var match=document.cookie.match(/(?:^|;\\s*)cookieConsent=([^;]*)/);
      var decision=(${parseConsentCookie.toString()})(match?decodeURIComponent(match[1]):null);
      pending=!decision||decision.version!==${CONSENT_VERSION};
    }catch(_){}
    if(!pending)return;
    html.setAttribute('data-consent-pending','');
    var actions=[],chosen=false,focused=false;
    function gate(){return html.hasAttribute('data-hero-intro')?null:document.getElementById('cookieConsent');}
    function focusGate(){var card=gate();if(card&&!focused){focused=true;card.focus({preventScroll:true});}}
    // Keep bootstrap-owned focus out of React's dehydrated event replay queue.
    // Focus still moves normally and stays trapped; handover removes this listener.
    function focusInside(event){var card=gate();if(!card)return;event.stopImmediatePropagation();if(!card.contains(event.target))card.focus({preventScroll:true});}
    function key(event){
      var card=gate();if(!card)return;
      if(event.key==='Escape'){event.preventDefault();if(!chosen)actions.push('escape');return;}
      if(event.key!=='Tab')return;
      var items=Array.from(card.querySelectorAll(${JSON.stringify(CONSENT_FOCUSABLE)})).filter(function(el){return el.offsetParent!==null||el===document.activeElement;});
      if(!items.length)return;
      // Safari may otherwise send Tab from the initial card out of the document.
      var index=items.indexOf(document.activeElement);
      var next=event.shiftKey?(index<=0?items.length-1:index-1):(index+1)%items.length;
      event.preventDefault();items[next].focus();
    }
    function click(event){
      var card=gate();if(!card||!(event.target instanceof Element))return;
      var button=event.target.closest('button');if(!button||!card.contains(button))return;
      var id=button.id;
      if(id!=='cookieAccept'&&id!=='cookieDecline'&&id!=='cookieInfoTrigger')return;
      event.preventDefault();event.stopImmediatePropagation();if(chosen)return;
      actions.push(id);if(id!=='cookieInfoTrigger')chosen=true;
    }
    var observer=new MutationObserver(focusGate);
    observer.observe(html,{childList:true,subtree:true,attributes:true,attributeFilter:['data-hero-intro']});
    document.addEventListener('focusin',focusInside,true);
    document.addEventListener('keydown',key,true);
    document.addEventListener('click',click,true);
    window.addEventListener(${JSON.stringify(CONSENT_INTERACTIVE_EVENT)},function(){
      observer.disconnect();
      document.removeEventListener('focusin',focusInside,true);
      document.removeEventListener('keydown',key,true);
      document.removeEventListener('click',click,true);
      actions.forEach(function(id){
        if(id==='escape')document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
        else{var button=document.getElementById(id);if(button)button.click();}
      });
      actions=[];
    },{once:true});
  }());`;
}

/** Static, with the same self-contained parser used by readConsent. */
export const CONSENT_BOOTSTRAP = /*#__PURE__*/ createConsentBootstrap();
