import { defineConfig } from 'vitepress'

export default defineConfig({
  // Served as a GitHub Pages project site: https://ripwords.github.io/MyInvoisClient/
  base: '/MyInvoisClient/',
  title: 'MyInvois Client',
  description:
    "TypeScript client for Malaysia's MyInvois (LHDN) e-invoicing API — document building, XAdES signing, submission and rate limiting.",
  lang: 'en-US',
  lastUpdated: true,
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API Reference', link: '/api/' },
      {
        text: 'Official LHDN SDK',
        link: 'https://sdk.myinvois.hasil.gov.my/',
      },
      {
        text: 'npm',
        link: 'https://www.npmjs.com/package/@ripwords/myinvois-client',
      },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Signing & Submission', link: '/guide/signing' },
            { text: 'Rate Limiting & Stores', link: '/guide/rate-limiting' },
            { text: 'Intermediaries (TIN:ROB)', link: '/guide/intermediaries' },
            { text: 'Runtime Code Lists', link: '/guide/codes' },
            { text: 'Error Handling', link: '/guide/errors' },
            { text: 'Certificates', link: '/guide/certificates' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'Client & Authentication', link: '/api/client' },
            { text: 'Document Submission', link: '/api/document-submission' },
            { text: 'Document Management', link: '/api/document-management' },
            { text: 'Taxpayer Validation', link: '/api/taxpayer-validation' },
            { text: 'Document Types & Notifications', link: '/api/platform' },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/Ripwords/MyInvoisClient' },
    ],
    footer: {
      message:
        'MIT Licensed. Not affiliated with LHDN — always cross-check the <a href="https://sdk.myinvois.hasil.gov.my/">official MyInvois SDK docs</a>.',
    },
    search: { provider: 'local' },
    outline: [2, 3],
  },
})
