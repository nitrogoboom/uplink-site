// Languages, the Astro way: astro.config.mjs lists them (i18n: locales, defaultLocale), every page is built once
// per language from the one file in src/pages/[...locale]/ (English at /, any other at /<language>/), and a page
// knows its own from Astro.currentLocale. To add French: add 'fr' to the config, then src/content/fr/ beside en/
// (what it lacks falls back to English).
import { i18n } from 'astro:config/client';
import { getRelativeLocaleUrl } from 'astro:i18n';

export const DEFAULT_LOCALE = i18n!.defaultLocale;
export const LOCALES = i18n!.locales.map((l) => (typeof l === 'string' ? l : l.path));
// a page's language: Astro.currentLocale, or the default where there is none (an endpoint)
export const localeOf = (current: string | undefined) => current ?? DEFAULT_LOCALE;

// <html lang> and og:locale: the language as spoken here
const LANG: Record<string, string> = { en: 'en-CA', fr: 'fr-CA' };
export const langTag = (current: string | undefined) => LANG[localeOf(current)] ?? localeOf(current);

// Links: written root-relative as in English ('/services', '/contact#message'); to() gives the page's language its
// own address (/fr/services). const to = linker(Astro.currentLocale); <a href={to('/services')}>
export const linker = (current: string | undefined) => {
  const locale = localeOf(current);
  return (path: string) => {
    const [page, hash] = path.split('#');
    const url = getRelativeLocaleUrl(locale, page.replace(/^\//, ''));
    return hash === undefined ? url : `${url}#${hash}`;
  };
};

// getStaticPaths for a page in src/pages/[...locale]/: one path a language, the default with no prefix
export const localeParam = (locale: string) => (locale === DEFAULT_LOCALE ? undefined : locale);
export const localePaths = () => LOCALES.map((locale) => ({ params: { locale: localeParam(locale) } }));

// One of a set of files that differ by language folder (import.meta.glob('../../content/*/privacy.md')): the page's
// own, or the default language's
export const byLocale = <T>(files: Record<string, T>, current: string | undefined): T => {
  const pick = (locale: string) => Object.entries(files).find(([path]) => path.includes(`/${locale}/`))?.[1];
  const file = pick(localeOf(current)) ?? pick(DEFAULT_LOCALE);
  if (!file) throw new Error(`no file for ${DEFAULT_LOCALE} among ${Object.keys(files).join(', ')}`);
  return file;
};
