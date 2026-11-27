// open a local page in Playwright, serving files from this folder via request interception (no server)
const path=require('path'),fs=require('fs');
const types={'.html':'text/html','.js':'text/javascript','.png':'image/png','.vrm':'application/octet-stream','.json':'application/json','.jpg':'image/jpeg'};
module.exports=async(page,root)=>{await page.route('http://local/**',r=>{const u=new URL(r.request().url());const f=path.join(root,decodeURIComponent(u.pathname));
 if(!fs.existsSync(f))return r.fulfill({status:404,body:''});r.fulfill({status:200,body:fs.readFileSync(f),headers:{'content-type':types[path.extname(f)]||'application/octet-stream'}});});};
