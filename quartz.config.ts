import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

/**
 * Quartz 4 Configuration
 *
 * See https://quartz.jzhao.xyz/configuration for more information.
 */
const config: QuartzConfig = {
  configuration: {
    pageTitle: "Nativi Digitali",
    pageTitleSuffix: " · Nativi Digitali",
    enableSPA: true,
    enablePopovers: true,
    analytics: {
      provider: "plausible",
    },
    locale: "it-IT",
    baseUrl: "localhost:8080",
    ignorePatterns: ["private", "templates", ".obsidian", "_private", "Readwise"],
    defaultDateType: "modified",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: "DM Serif Display",   // Editoriale, forte — ispirato a Galloway
        body: "DM Sans",              // Moderno, pulito — ispirato a The Neuron
        code: "IBM Plex Mono",
      },
      colors: {
        lightMode: {
          light: "#f8f6f1",           // Off-white caldo
          lightgray: "#e8e2d9",       // Grigio caldo
          gray: "#9e9488",            // Grigio medio caldo
          darkgray: "#3d3830",        // Grigio scuro caldo
          dark: "#1a1612",            // Near-black caldo
          secondary: "#c8392d",       // Rosso editoriale — Galloway
          tertiary: "#e8734a",        // Arancio bruciato — The Neuron
          highlight: "rgba(200, 57, 45, 0.07)",
          textHighlight: "#fde68a88",
        },
        darkMode: {
          light: "#1a1e0f",           // Olive scuro — The Neuron dark
          lightgray: "#2d3318",       // Olive più chiaro
          gray: "#6b7250",            // Olive medio
          darkgray: "#c8c4ae",        // Testo secondario caldo
          dark: "#f0ece0",            // Testo principale warm white
          secondary: "#e8574b",       // Rosso più luminoso per dark mode
          tertiary: "#f0874d",        // Arancio più luminoso per dark mode
          highlight: "rgba(232, 87, 75, 0.12)",
          textHighlight: "#4a3d0088",
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "git", "filesystem"],
      }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "github-light",
          dark: "github-dark",
        },
        keepBackground: false,
      }),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
      Plugin.Latex({ renderEngine: "katex" }),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.Favicon(),
      Plugin.NotFoundPage(),
      // Comment out CustomOgImages to speed up build time
      Plugin.CustomOgImages(),
    ],
  },
}

export default config
