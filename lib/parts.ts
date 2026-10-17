import { categoryValues } from "./machineryCatalog";
export const PART_GROUPS = [
 {id:"engine",label:"Motor ve motor parçaları"},{id:"hydraulics",label:"Hidrolik pompa, valf ve silindir"},{id:"undercarriage",label:"Palet ve yürüyüş takımı"},{id:"transmission",label:"Şanzıman, diferansiyel ve aktarma"},{id:"brakes",label:"Fren ve süspansiyon"},{id:"electrical",label:"Elektrik, elektronik ve sensörler"},{id:"cooling",label:"Radyatör ve soğutma"},{id:"fuel",label:"Yakıt sistemi ve enjektör"},{id:"filters",label:"Filtre ve bakım parçaları"},{id:"seals",label:"Keçe, conta ve rulman"},{id:"body",label:"Kabin, kaporta ve cam"},{id:"attachments",label:"Kova, kırıcı ve ataşman"},{id:"lifting",label:"Bom, halat ve kaldırma parçaları"},{id:"tires",label:"Lastik ve jant"},{id:"exhaust",label:"Egzoz ve emisyon parçaları"},{id:"other",label:"Diğer yedek parçalar"}
] as const;
export type PartGroup = typeof PART_GROUPS[number]["id"];
const road = new Set(["Kamyon","Damperli kamyon","Kırkayak kamyon","Çekici (tır)","Kurtarıcı (oto çekici)","Tanker","Dorse / römork","Lowbed","Beton mikseri"]);
export function partGroupsFor(equipment: string) {
 const values=categoryValues(equipment);if(!values.length)return [...PART_GROUPS];
 if(values.every(v=>road.has(v)))return PART_GROUPS.filter(g=>!["undercarriage","attachments","lifting"].includes(g.id));
 return [...PART_GROUPS];
}
export function validPartGroup(group: string) { return PART_GROUPS.some(g=>g.id===group); }
export function partGroupLabel(group?: string|null) { return PART_GROUPS.find(g=>g.id===group)?.label ?? "Parça grubu belirtilmedi"; }
export function partsSearchText(value:string){return value.replace(/[^\p{L}\p{N}\s/\-]/gu," ").trim().slice(0,100);}
