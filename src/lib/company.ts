/**
 * Single source of truth for company contact details and depot addresses.
 *
 * The contact values and store listings are env-configurable (VITE_* in
 * .env, see src/env.ts) so the real details can be set per environment
 * without a code change; the literals below are the fallbacks when an env
 * var is unset. TODO: the fallback phone, email and street addresses are
 * placeholders pending the real details from the desk team.
 */
import { env } from "@/env";

export const WHATSAPP_URL =
	env.VITE_WHATSAPP_URL ?? "https://chat.whatsapp.com/K0OVqaE6KJf80A2jd4nIWM";
export const SUPPORT_PHONE = env.VITE_SUPPORT_PHONE ?? "+234 705 555 9623";
// Direct WhatsApp chat with the support desk — derived from SUPPORT_PHONE so
// one env var drives the number everywhere it appears (tel:, display, wa.me).
// Distinct from WHATSAPP_URL, which is the community group-invite link.
export const SUPPORT_WHATSAPP_URL = `https://wa.me/${SUPPORT_PHONE.replace(/\D/g, "")}`;
export const SUPPORT_EMAIL = env.VITE_SUPPORT_EMAIL ?? "support@soromannl.com";

export const LOADING_HOURS = "7:00am to 6:00pm, Monday to Saturday";

export const APP_STORE_URL =
	env.VITE_APP_STORE_URL ?? "https://apps.apple.com/app/id6801204228";
export const PLAY_STORE_URL =
	env.VITE_PLAY_STORE_URL ??
	"https://play.google.com/store/apps/details?id=com.soroman.customer";

/**
 * The Android app, downloaded straight from this site (the owner, 19 Nov 2026:
 * "put it on our soroman web site under download android, not link to Play
 * Store for now"), until the Play Store upload key is sorted out. The file is
 * in public/downloads; a new version gets a new file name, so no cache serves
 * an old one. Signed with Soroman's own key, so it cannot install over a copy
 * from Google Play — that one is uninstalled first.
 */
export const ANDROID_APK_VERSION = "1.0.6";
export const ANDROID_APK_URL = `/downloads/soroman-android-${ANDROID_APK_VERSION}.apk`;

/**
 * The staff/admin dashboard. A separate app on its own subdomain, so it is a
 * plain external link opened in a new tab rather than a route — the customer
 * site should never navigate away from itself into it.
 */
export const STAFF_DASHBOARD_URL =
	env.VITE_STAFF_DASHBOARD_URL ?? "https://dashboard.ordersoroman.com";

export const COMPANY_NAME = "Soroman Energy";

/** The head-office / main-depot street address shown on the contact page. */
export const OFFICE_ADDRESS =
	env.VITE_OFFICE_ADDRESS ??
	"Soroman Depot, Portside Industrial Area, Esuk Utan, Calabar, Cross River State";

/** A Google Maps directions link for any address string. */
export const mapsHref = (address: string) =>
	`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

export const telHref = (phone: string) => `tel:${phone.replace(/\s/g, "")}`;
