import {test,expect} from '@playwright/test';
test.setTimeout(90000);
import {CONSENT_VERSION} from '../lib/consent';
for(const width of [667,844]) test(`spot return preserves landscape map controls ${width}`,async({page,context,baseURL})=>{
 await context.addCookies([{name:'cookieConsent',value:`declined.${CONSENT_VERSION}`,url:baseURL!}]);
 await page.setViewportSize({width,height:390});
 await page.goto('/map',{waitUntil:'domcontentloaded'});
 await expect(page.locator('.maplibregl-marker').first()).toBeVisible({timeout:30000});
 await page.locator('#map-results-panel [data-list-row] [role="button"]').first().click();
 const detail=page.locator('[data-detail-root="restaurant"]');
 await expect(detail).toBeVisible({timeout:45000});
 const hero=detail.locator('[data-detail-hero]');
 await expect.poll(()=>hero.evaluate(el=>{const bg=getComputedStyle(el).backgroundImage;return bg!=='none'})).toBe(true);
 await hero.evaluate(async el=>{const url=getComputedStyle(el).backgroundImage.slice(5,-2);const img=new Image();img.src=url;await img.decode();});
 await expect.poll(()=>hero.evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.playState==='running').length)).toBe(0);
 await page.screenshot({path:`/tmp/eat-this-spot-landscape-${width}.png`});
 const bounds=await hero.boundingBox();
 expect.soft(bounds!.y).toBeGreaterThanOrEqual(0);
 const canvas=page.locator('.maplibregl-canvas');
 const canvasBox=await canvas.boundingBox();
 expect.soft(canvasBox!.x+canvasBox!.width).toBeLessThanOrEqual(bounds!.x+1);
 if(width===844){await page.setViewportSize({width:390,height:844});await expect(detail).toBeVisible({timeout:45000});await page.setViewportSize({width,height:390});await expect(hero).toBeInViewport();}
 expect.soft(bounds!.width).toBeLessThan(390);
 expect.soft(bounds!.height).toBeLessThan(280);
 await detail.getByRole('button',{name:/^(Karte|Liste)$/,exact:true}).last().click();
 const menu=page.getByRole('button',{name:'Menü',exact:true});
 await expect(menu).toBeInViewport();
 await expect(page.getByRole('searchbox',{name:'Suche',exact:true})).toBeInViewport();
 await menu.click();
 await expect(page.getByRole('dialog',{name:'Navigation'})).toBeVisible();
});

test('Must Eats landscape sizes use the short viewport',async({page,context,baseURL})=>{
 await context.addCookies([{name:'cookieConsent',value:`declined.${CONSENT_VERSION}`,url:baseURL!}]);
 await page.setViewportSize({width:844,height:390});
 await page.goto('/must-eats');
 const title=page.locator('main h1');
 expect(await title.evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeLessThan(81);
 const section=page.locator('[data-band="open"]');
 await section.scrollIntoViewIfNeeded();
 const card=section.locator('ol button').first();
 await expect.poll(()=>card.locator('img').evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0)).toBe(true);
 expect((await card.boundingBox())!.height).toBeLessThan(210);
 expect((await card.boundingBox())!.height).toBeGreaterThan(100);
 await section.locator('h2').scrollIntoViewIfNeeded();
 for(const img of (await section.locator('ol button img').all()).slice(0,4)) await expect.poll(()=>img.evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0)).toBe(true);
 await page.screenshot({path:'/tmp/eat-this-musteats-landscape-scale.png'});
});
