export default {
  title: "Ichikara",
  url: "https://nellowtcs.me/Ichikara/docs",
  logo: { alt: "Ichikara", href: "./" },
  favicon: "",
  theme: {
    name: "ruby",
    defaultMode: "system",
    enableModeToggle: true,
    positionMode: "top",
    codeHighlight: true,
    customCss: ["/assets/css/theme.css"],
    copyWidgets: {
      enabled: true,
      raw: true,
      context: true,
    },
  },
  layout: {
    footer: {
      style: "complete",
      description: "A speech-synthesis library for singing voice synthesis in the browser.",
      branding: true,
      columns: [
        {
          title: "Resources",
          links: [
            { text: "Getting Started", url: "./getting-started/quickstart" },
            { text: "API Reference", url: "./api/" },
            { text: "Voice Config", url: "./api/voice-config" },
          ],
        },
        {
          title: "Community",
          links: [
            { text: "GitHub", url: "https://github.com/NellowTCS/Ichikara" },
            { text: "Issues", url: "https://github.com/NellowTCS/Ichikara/issues" },
            { text: "Discussions", url: "https://github.com/NellowTCS/Ichikara/discussions" },
          ],
        },
      ],
    },
  },
  plugins: {
    search: {
      semantic: true,
      showConfidence: true,
    },
    seo: {
      defaultDescription:
        "Ichikara is a speech-synthesis library for singing voice synthesis in the browser. Cross-language phoneme support with an LF-glottal source-formant filter engine.",
      openGraph: { defaultImage: "" },
      twitter: { cardType: "summary_large_image" },
    },
    sitemap: {
      defaultChangefreq: "weekly",
      defaultPriority: 0.8,
    },
    mermaid: {},
    git: {},
    llms: {
      fullContext: true,
    },
  },
  search: true,
  minify: true,
  autoTitleFromH1: true,
  copyCode: true,
  pageNavigation: true,
  navigation: [
    { title: "Home", path: "/", icon: "home" },
    {
      title: "Getting Started",
      icon: "rocket",
      collapsible: false,
      children: [
        { title: "Quick Start", path: "/getting-started/quickstart", icon: "play" },
        { title: "Installation", path: "/getting-started/installation", icon: "download" },
        { title: "Core Concepts", path: "/getting-started/concepts", icon: "book" },
      ],
    },
    {
      title: "Guide",
      icon: "book-open",
      collapsible: false,
      children: [
        { title: "Architecture", path: "/guide/architecture", icon: "box" },
        { title: "Renderer", path: "/guide/renderer", icon: "cpu" },
        { title: "Languages", path: "/guide/languages", icon: "globe" },
      ],
    },
    {
      title: "API Reference",
      icon: "code",
      path: "/api/",
      collapsible: false,
      children: [
        { title: "VoiceConfig", path: "/api/voice-config", icon: "sliders" },
        { title: "DSP Primitives", path: "/api/dsp", icon: "audio-waveform" },
        { title: "Import / Export", path: "/api/import-export", icon: "file-up" },
      ],
    },
    {
      title: "GitHub",
      path: "https://github.com/NellowTCS/Ichikara",
      icon: "github",
      external: true,
    },
  ],
  footer: "Built with [docmd](https://docmd.io). [View on GitHub](https://github.com/NellowTCS/Ichikara).",
  editLink: {
    enabled: true,
    baseUrl: "https://github.com/NellowTCS/Ichikara/edit/main/",
    text: "Edit this page",
  },
};
