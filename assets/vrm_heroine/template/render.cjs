const {chromium}=require('playwright');const fs=require('fs');const {spawn}=require('child_process');const serve=require('./serve.cjs');
(async()=>{const mode=process.argv[2];const b=await chromium.launch({args:['--use-gl=swiftshader','--ignore-gpu-blocklist']});
const p=await b.newPage({viewport:{width:1080,height:1920}});p.on('pageerror',e=>console.log('E',e.message));
await serve(p,__dirname);await p.goto('http://local/index.html');await p.waitForFunction('window.ready',null,{timeout:180000});
if(mode==='test'){for(const t of process.argv[3].split(',').map(Number)){await p.evaluate(t=>step(t),t);await p.screenshot({path:`t_${t}.jpg`,type:'jpeg',quality:85});}}
else{const dur=parseFloat(process.argv[3]);const out=process.argv[4];
 const ff=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate','30','-c:v','mjpeg','-i','-','-c:v','libx264','-preset','veryfast','-crf','19','-pix_fmt','yuv420p',out+'.tmp.mp4'],{stdio:['pipe','inherit','inherit']});
 const N=Math.round(dur*30);const t0=Date.now();
 for(let i=0;i<N;i++){await p.evaluate(t=>step(t),i/30);const buf=await p.screenshot({type:'jpeg',quality:92});if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r));if(i%60==0)console.log(i,((Date.now()-t0)/1000).toFixed(0)+'s');}
 ff.stdin.end();await new Promise(r=>ff.on('close',c=>{if(c===0)fs.renameSync(out+'.tmp.mp4',out);r();}));}
await b.close();})();
