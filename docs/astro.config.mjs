// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
    integrations: [
        starlight({
            title: 'DolphJS',
            description: 'The New-Age, developer-friendly Node.js framework for building scalable enterprise applications.',
            logo: {
                src: './src/assets/logo.svg',
            },
            favicon: '/favicon.ico',
            head: [
                {
                    tag: 'meta',
                    attrs: { name: 'theme-color', content: '#0a0a0f' },
                },
                {
                    tag: 'link',
                    attrs: { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
                },
                {
                    tag: 'link',
                    attrs: { rel: 'mask-icon', href: '/safari-pinned-tab.svg', color: '#00e1ff' },
                },
                {
                    tag: 'meta',
                    attrs: { name: 'msapplication-TileImage', content: '/mstile-150x150.png' },
                },
                {
                    tag: 'meta',
                    attrs: { property: 'og:image', content: '/android-chrome-144x144.png' },
                },
                {
                    tag: 'meta',
                    attrs: { property: 'twitter:image', content: '/android-chrome-144x144.png' },
                }
            ],
            expressiveCode: {
                themes: ['one-dark-pro'],
                styleOverrides: {
                    borderRadius: '0.5rem',
                },
            },
            customCss: ['./src/styles/custom.css'],
            social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/dolphjs/dolph' }],
            sidebar: [
                {
                    label: 'Getting Started',
                    link: '/getting-started/',
                },
                {
                    label: 'Examples',
                    link: '/examples/',
                },
                {
                    label: 'Core Concepts',
                    items: [{ autogenerate: { directory: 'core-concepts' } }],
                },
                {
                    label: 'Techniques',
                    items: [{ autogenerate: { directory: 'techniques' } }],
                },
                {
                    label: 'MVC',
                    items: [{ autogenerate: { directory: 'mvc' } }],
                },
                {
                    label: 'Architecture',
                    link: '/architecture/',
                },
                {
                    label: 'Config',
                    link: '/config/',
                },
                {
                    label: 'CLI',
                    link: '/cli/',
                },
                {
                    label: 'Testing',
                    link: '/testing/',
                },
                {
                    label: 'GraphQL',
                    link: '/graphql/',
                },
                {
                    label: 'Websockets',
                    link: '/websockets/',
                },
            ],
        }),
    ],
});
