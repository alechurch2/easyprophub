/**
 * EasyProp Brand Configuration
 * 
 * Per sostituire il logo:
 * 1. Logo principale: sostituisci il file in src/assets/logo.png (o .svg)
 * 2. Logo compatto (sidebar): sostituisci src/assets/logo-icon.png (o .svg)
 * 3. Favicon: sostituisci public/favicon.svg (o .ico/.png)
 * 
 * Se i file logo non esistono, il sistema usa un placeholder testuale elegante.
 */

export const BRAND = {
  name: "EasyProp",
  tagline: "Il tuo edge nel trading, semplificato.",
  description: "Portale riservato EasyProp per formazione, supporto operativo e AI Chart Review.",
  copyright: `© ${new Date().getFullYear()} EasyProp. Tutti i diritti riservati.`,
  
  // Paths per asset — aggiorna qui quando carichi i file definitivi
  logo: null as string | null,       // Loaded via ES6 import in BrandLogo
  logoIcon: null as string | null,
  favicon: "/favicon.png",
} as const;
