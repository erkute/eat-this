import {test,expect} from '@playwright/test';
test.setTimeout(90000);
import {CONSENT_VERSION} from '../lib/consent';
for(const path of ['/must-eats','/kategorie','/kategorie/pizza','/bezirk','/bezirk/mitte','/news','/packs','/about']) test(`landscape page ${path}`,async({page,context,baseURL})=>{
 await context.addCookies([{name:'cookieConsent',value:`declined.${CONSENT_VERSION}`,url:baseURL!}]);
 await page.setViewportSize({width:844,height:390});
 const response=await page.goto(path,{waitUntil:'domcontentloaded'});expect(response?.status()).toBe(200);
 await expect(page.locator('h1').first()).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(845);
 await page.screenshot({path:`/tmp/eat-this-audit-${path.replaceAll('/','-')}.png`});
});
test('landscape chat has room for conversation',async({page,context,baseURL})=>{
 await context.addCookies([{name:'cookieConsent',value:`declined.${CONSENT_VERSION}`,url:baseURL!}]);
 await page.setViewportSize({width:844,height:390});await page.goto('/about');
 await expect(page.locator('html')).toHaveAttribute('data-active-page', 'about');
 await expect(async()=>{ await page.locator('#burgerBtn').click(); await expect(page.locator('#burgerBtn')).toHaveAttribute('aria-expanded','true',{timeout:1000}); }).toPass({timeout:15000});await page.getByRole('button',{name:'Frag Remy',exact:true}).click();
 const panel=page.locator('#buddy-panel');await expect(panel).toBeVisible({timeout:30000});
 await page.screenshot({path:'/tmp/eat-this-audit-remy.png'});
 expect((await panel.boundingBox())!.height).toBeGreaterThan(320);
});
for(const width of [667,844]) test('landscape signup '+width,async({page,context,baseURL})=>{
 await context.addCookies([{name:'cookieConsent',value:`declined.${CONSENT_VERSION}`,url:baseURL!}]);
 await page.setViewportSize({width,height:width===667?375:390});await page.goto('/about');
 await expect(page.locator('html')).toHaveAttribute('data-active-page', 'about');
 await expect(async()=>{ await page.locator('#burgerBtn').click(); await expect(page.locator('#burgerBtn')).toHaveAttribute('aria-expanded','true',{timeout:1000}); }).toPass({timeout:15000});
 await page.getByRole('dialog',{name:'Navigation',exact:true}).getByRole('button',{name:'Anmelden',exact:true}).click();
 const panel=page.locator('[data-login-panel]');
 await expect(panel).toBeVisible({timeout:30000});
 await expect.poll(()=>panel.evaluate(el=>el.scrollHeight-el.clientHeight)).toBeLessThanOrEqual(1);
 await expect(panel.locator('input')).toBeInViewport({ratio:1});
 await expect(panel.getByRole('link').last()).toBeInViewport({ratio:1});
 await page.screenshot({path:`/tmp/eat-this-landscape-login-${width}.png`});
});
test('landscape cards align and district photos stay compact',async({page,context,baseURL})=>{
 await context.addCookies([{name:'cookieConsent',value:`declined.${CONSENT_VERSION}`,url:baseURL!}]);
 await page.setViewportSize({width:844,height:390});await page.goto('/must-eats',{waitUntil:'domcontentloaded'});
 const item=page.locator('[class*="MustEatsSection_featureItem"]').first();
 await item.scrollIntoViewIfNeeded();
 await expect.poll(()=>item.locator('img').evaluate((el:HTMLImageElement)=>el.complete && el.naturalWidth>0)).toBe(true);
 const card=await item.locator('[class*="MustEatsSection_card"]').first().boundingBox();
 const caption=await item.locator('[class*="MustEatsSection_caption"]').boundingBox();
 expect(Math.abs(card!.x-caption!.x)).toBeLessThan(2);
 await page.screenshot({path:'/tmp/eat-this-aligned-musteats.png'});
 await page.goto('/bezirk/mitte',{waitUntil:'domcontentloaded'});
 const photo=page.locator('[class*="HubIssue_districtSpots"] [class*="HubIssue_spotPhoto"]').first();
 await photo.scrollIntoViewIfNeeded();
 expect((await photo.boundingBox())!.height).toBeLessThan(200);
 await page.screenshot({path:'/tmp/eat-this-compact-district.png'});
});
for(const [width,height] of [[390,844],[820,1180],[1440,1000],[667,375]]) test('page layouts '+width+'x'+height,async({page,context,baseURL})=>{
 await context.addCookies([{name:'cookieConsent',value:`declined.${CONSENT_VERSION}`,url:baseURL!}]);
 await page.setViewportSize({width,height});
 for(const path of ['/must-eats','/kategorie','/kategorie/pizza','/bezirk','/bezirk/mitte','/news','/packs','/about']){
 await page.goto(path,{waitUntil:'domcontentloaded'});await expect(page.locator('h1').first()).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
 }
});

test('pack detail fits landscape',async({page,context,baseURL})=>{
 await context.addCookies([{name:'cookieConsent',value:`declined.${CONSENT_VERSION}`,url:baseURL!}]);
 await page.setViewportSize({width:667,height:375});await page.goto('/packs',{waitUntil:'domcontentloaded'});
 const href=await page.locator('a[href^="/pack/"]').first().getAttribute('href');
 expect(href).toBeTruthy();await page.goto(href!,{waitUntil:'domcontentloaded'});
 await expect(page.locator('h1')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(668);
 await page.screenshot({path:'/tmp/eat-this-pack-detail-landscape.png'});
});
