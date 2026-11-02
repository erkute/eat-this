import {test,expect} from '@playwright/test';
import {CONSENT_VERSION} from '../lib/consent';
test('rotated Must Eat keeps card and restaurant visible',async({page,context,baseURL})=>{
 await context.addCookies([{name:'cookieConsent',value:`declined.${CONSENT_VERSION}`,url:baseURL!}]);
 await page.setViewportSize({width:390,height:844});
 await page.goto('/map?me=mustead-main-6');
 const detail=page.locator('[data-detail-root="must-eat"]');
 await expect(detail).toBeVisible();
 await page.setViewportSize({width:Number(process.env.LANDSCAPE_WIDTH || 844),height:390});
 await page.getByRole('button',{name:'Karte vergrößern',exact:true}).locator('img').waitFor();


 const card=page.getByRole('button',{name:'Karte vergrößern',exact:true});
 const box=await card.boundingBox();
 expect(box?.height).toBeLessThan(300);
 expect(box?.height).toBeGreaterThan(100);
 await expect(page.getByRole('button',{name:'Zum Spot: Slice Society',exact:true})).toBeInViewport();
 await expect.poll(()=>card.locator('img').evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0)).toBe(true);
 await expect.poll(()=>card.evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.playState==='running').length)).toBe(0);
 await page.screenshot({path:'/tmp/eat-this-landscape-detail-after.png'});
 await detail.getByRole('button',{name:/^Nächstes Must Eat/}).click();
 await expect(page.getByRole('button',{name:/^Zum Spot: Hokey Pokey/})).toBeInViewport();
 await page.setViewportSize({width:390,height:844});
 await expect(page.getByRole('button',{name:/^Zum Spot: Hokey Pokey/})).toBeInViewport();
});

test('landscape map uses a side list and reachable menu',async({page,context,baseURL})=>{
 await context.addCookies([{name:'cookieConsent',value:`declined.${CONSENT_VERSION}`,url:baseURL!}]);
 await page.setViewportSize({width:Number(process.env.LANDSCAPE_WIDTH || 844),height:390});
 await page.goto('/map');
 const sheet=page.locator('[data-map-sheet]');
 await expect(sheet).toBeVisible();
 const box=await sheet.boundingBox();
 expect(box!.x).toBeGreaterThan(300);
 expect(box!.y).toBeLessThan(20);
 await expect(page.getByRole('button',{name:'Gazzo',exact:true}).or(page.getByRole('checkbox',{name:'Gazzo',exact:true}))).toBeVisible();
 await page.screenshot({path:'/tmp/eat-this-landscape-map-after.png'});
 await page.getByRole('button',{name:'Menü',exact:true}).click();
 const nav=page.getByRole('dialog',{name:'Navigation'});
 await expect(nav.getByRole('link',{name:'Kategorien',exact:true})).toBeInViewport();
 await page.screenshot({path:'/tmp/eat-this-landscape-menu-after.png'});
});
