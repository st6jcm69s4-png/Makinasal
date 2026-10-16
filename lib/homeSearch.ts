import { CITIES } from "./data/constants";
export const HOME_TABS = [
  {
    id: "sale",
    label: "Satılık",
    route: "/ilanlar",
    placeholder: "Marka, model veya makine ara",
  },
  {
    id: "rental",
    label: "Kiralık",
    route: "/kiralik",
    placeholder: "Kiralık ekskavatör, kamyon, vinç…",
  },
  {
    id: "jobs",
    label: "İşler",
    route: "/isler",
    placeholder: "Kamyon işi, hafriyat, nakliye…",
  },
  {
    id: "parts",
    label: "Parçalar",
    route: "/ilanlar",
    placeholder: "Parça adı, model veya kod ara",
  },
  {
    id: "firms",
    label: "Firmalar",
    route: "/firmalar",
    placeholder: "Firma veya hizmet sağlayıcı adı ara",
  },
] as const;
export type HomeTab = (typeof HOME_TABS)[number]["id"];
export function homeSearchUrl(tab: HomeTab, q: string, city: string) {
  const item = HOME_TABS.find((t) => t.id === tab) ?? HOME_TABS[0];
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim().slice(0, 200));
  if ((CITIES as readonly string[]).includes(city)) params.set("city", city);
  if (tab === "parts") params.set("cat", "Yedek parça");
  return item.route + (params.size ? "?" + params : "");
}
export function locationUrl(route: string, city: string) {
  const params = new URLSearchParams();
  if ((CITIES as readonly string[]).includes(city)) params.set("city", city);
  return route + (params.size ? "?" + params : "");
}
