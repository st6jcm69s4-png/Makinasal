'use client';
import {useMarket} from './MarketProvider';
import {useAdminAccess} from './useAdminAccess';
import { CookiePreferences } from './CookiePreferences';
import { LanguageSwitcher, useLanguage } from './LanguageProvider';
import { ThemeSwitcher } from './ThemeSwitcher';
export function SettingsView(){const {t}=useLanguage();const {profile}=useMarket();const {admin}=useAdminAccess(profile?.id);return <><h1>{t('Ayarlar')}</h1><p className="lead">{t('Dilini ve hesap tercihlerini buradan yönet.')}</p><div className="settings-grid"><section className="panel"><h2>{t('Dil ve görünüm')}</h2><p>{t('Uygulama dili')}</p><LanguageSwitcher/><p>{t('Görünüm')}</p><ThemeSwitcher/><p className="sub" role="status">{t('Dil tercihin bu tarayıcıda saklanır. İlanlar ve mesajlar yazıldıkları dilde kalır.')}</p></section><section className="panel"><h2>{t('Hesap ayarları')}</h2><p>{t('İsim, il, ilçe ve profil açıklamalarını güncelle.')}</p><a className="btn ghost" href="/profil">{t('Profilimi düzenle')}</a><p>{t('E-posta ve telefon doğrulamasını yönet.')}</p><a className="btn ghost" href="/hesap-dogrula">{t('Hesap güvenliği')}</a></section></div><p><a href="/bildirimler">{t("Bildirimler")}</a></p><p><a href="/toplu-ilan">{t("Toplu ilan aktarımı")}</a></p><>{admin?<p><a className="btn ghost" href="/yonetim">{t("Yönetim")}</a></p>:null}</><CookiePreferences/></>;}
