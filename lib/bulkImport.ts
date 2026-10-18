import {CATEGORIES,CITIES,MACHINE_CATEGORIES} from './data/constants';
import {validPartGroup} from './parts';
export const IMPORT_FIELDS=['category','brand','model','title','price','city','year','description','spec','equipment_category','part_group'] as const;
/** RFC4180-style commas/semicolons, quoted line breaks, BOM; never evaluates cells. */
export function parseCsv(text:string):string[][] {
 text=text.replace(/^\uFEFF/,'');const first=text.split(/\r?\n/,1)[0];const delimiter=first.includes(';')?';':',';
 const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else if(!quoted&&cell==='')quoted=true;else if(quoted)quoted=false;else throw new Error('CSV_QUOTE');}
 else if(!quoted&&c===delimiter){row.push(cell);cell='';}
 else if(!quoted&&(c==='\n'||c==='\r')){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell='';}
 else cell+=c;}
 if(quoted)throw new Error('CSV_QUOTE');row.push(cell);if(row.some(x=>x.trim()))rows.push(row);return rows;
}
export function csvRecords(text:string):Record<string,string>[]{const [headers,...rows]=parseCsv(text);if(!headers||new Set(headers).size!==headers.length||headers.some(h=>!(IMPORT_FIELDS as readonly string[]).includes(h)))throw new Error('CSV_HEADERS');if(rows.length>100)throw new Error('IMPORT_LIMIT');return rows.map(row=>{if(row.length!==headers.length)throw new Error('CSV_COLUMNS');return Object.fromEntries(headers.map((h,i)=>[h,row[i].trim()]));});}
export function importValues(r:Record<string,string>){
 const category=r.category||'',title=r.title||[r.brand,r.model].filter(Boolean).join(' '),price=Number(r.price),year=r.year?Number(r.year):null;
 if(!(CATEGORIES as readonly string[]).includes(category)||!(CITIES as readonly string[]).includes(r.city)||title.length<3||title.length>160||(r.brand?.length||0)>60||(r.model?.length||0)>80||!r.price||!Number.isFinite(price)||price<=0||price>1e12||Math.abs(price*100-Math.round(price*100))>0.0001||year!==null&&(!Number.isInteger(year)||year<1900||year>new Date().getFullYear()+2)||Object.values(r).some(v=>v.length>5000))throw new Error('IMPORT_ROW');
 const part=category==='Yedek parça',tire=category==='Lastik ve jant';
 if((part||tire)&&(!(MACHINE_CATEGORIES as readonly string[]).includes(r.equipment_category)||!validPartGroup(r.part_group)))throw new Error('IMPORT_PART');
 return {kind:part?'part':tire?'tire':'machine',category,title,price,city:r.city,brand:r.brand||null,model:r.model||null,year,description:r.description||'',spec:r.spec?.slice(0,200)||null,equipment_category:part||tire?r.equipment_category:null,part_group:part||tire?r.part_group:null,status:'paused'};
}
