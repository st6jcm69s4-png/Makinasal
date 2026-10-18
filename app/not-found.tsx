import { Text } from "@/components/LanguageProvider";
export default function NotFound() {
  return <div className="panel"><h1><Text value={"Sayfa bulunamadı"} /></h1><p><Text value={"Bağlantı değişmiş veya sayfa kaldırılmış olabilir."} /></p><a className="btn" href="/ilanlar"><Text value={"İlanları incele"} /></a></div>;
}
