// Isolated browser integration: all cloud traffic is mocked; no shared teacher data is changed.
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const root=path.join(__dirname,'dist');const server=http.createServer((req,res)=>{const file=path.join(root,decodeURIComponent(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(data);});});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser;
 try{
 browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 let remote=null,revision=0;
 await page.route('https://**/*',async route=>{const req=route.request();if(req.method()==='GET')return route.fulfill({json:remote?[{book:remote,revision}]:[]});remote=req.postDataJSON().book;revision++;await route.fulfill({json:[{revision}]});});
 await page.clock.install({time:new Date('2026-10-02T15:59:00Z')});
 await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('[data-teacher="weize"]').click();await page.waitForFunction(()=>cloudReady);
 await page.locator('#grade1Feedback').fill('高一：下週解釋圖表');await page.locator('#grade2Feedback').fill('高二：整理問題');await page.locator('#feedbackForm button').click();await page.waitForFunction(()=>!cloudSync.pending);
 await page.reload();await page.locator('[data-teacher="weize"]').click();await page.waitForFunction(()=>cloudReady);assert.equal(await page.locator('#grade1Feedback').inputValue(),'高一：下週解釋圖表');
 await page.locator('#grade2Feedback').fill('尚未送出的高二草稿');
 await page.clock.setSystemTime(new Date('2026-10-02T16:00:00Z'));await page.evaluate(()=>render());assert.equal(await page.locator('#grade1Feedback').inputValue(),'');assert.equal(await page.locator('#feedbackWeek').inputValue(),'2026-10-03');
 await page.locator('#feedbackWeek').selectOption('2026-09-26');assert.equal(await page.locator('#grade2Feedback').inputValue(),'尚未送出的高二草稿');await page.locator('#feedbackWeek').selectOption('2026-10-03');
 assert(await page.locator('#inquirySummary').isHidden());
 const plan=await page.evaluate(()=>{const source=lessons('2026-10-05').find(l=>!l.inquiry),target=lessons('2026-10-06').find(l=>!l.inquiry);selectedClass=source.classId;selectedDate=source.date;return {source,target,next:lessons('2026-10-12'),before:remaining(source.classId,state.exams[0]).total};});
 await page.locator('#adjustLessons').click();await page.locator('#adjustSource').selectOption(plan.source.key);await page.locator('#adjustDate').fill(plan.target.date);await page.locator('#adjustTime').fill(plan.target.time);await page.locator('#adjustTime').dispatchEvent('change');
 assert((await page.locator('#adjustConflicts').innerText()).includes('被取代')||(await page.locator('#adjustConflicts').innerText()).includes('取代'));
 await page.locator('#applyAdjustment').click();assert.equal(await page.evaluate(k=>lessons('2026-10-05').some(l=>l.key===k),plan.source.key),false);assert.equal(await page.evaluate(k=>lessons('2026-10-06').some(l=>l.key===k),plan.target.key),false);
 assert.deepEqual(await page.evaluate(()=>lessons('2026-10-12')),plan.next);
 await page.screenshot({path:'review/planner-desktop.png',fullPage:true});
 await page.locator('[data-undo-adjustment]').click();assert(await page.evaluate(k=>lessons('2026-10-05').some(l=>l.key===k),plan.source.key));
 await page.locator('#adjustType').selectOption('delete');await page.locator('#adjustSource').selectOption(plan.source.key);await page.locator('#applyAdjustment').click();assert.equal(await page.evaluate(k=>lessons('2026-10-05').some(l=>l.key===k),plan.source.key),false);await page.locator('[data-undo-adjustment]').click();
 await page.locator('#adjustType').selectOption('extra');await page.locator('#adjustDate').fill('2026-10-10');await page.locator('#adjustTime').fill('08:10');await page.locator('#applyAdjustment').click();assert.equal(await page.evaluate(c=>lessons('2026-10-10',c).length,plan.source.classId),1);
 await page.locator('#adjustDialog [data-close]').click();await page.setViewportSize({width:390,height:844});await page.screenshot({path:'review/planner-mobile.png',fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.locator('#adjustLessons').click();assert(await page.evaluate(()=>document.querySelector('#adjustDialog').getBoundingClientRect().width<=innerWidth));await page.locator('#adjustDialog [data-close]').click();
 await page.evaluate(()=>enterTeacher('hexin'));await page.waitForFunction(()=>cloudReady); // mock returns same book; verify workspace-isolated feedback with a fresh owner book.
 await page.evaluate(()=>applySharedBook(defaultTeacherBook('hexin')));assert(await page.locator('#feedbackPanel').isHidden());
 assert.deepEqual(errors,[]);console.log('PASS: browser feedback save/reload/Saturday drafts, move replacement, undo/delete/makeup, mobile overflow and teacher isolation');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
