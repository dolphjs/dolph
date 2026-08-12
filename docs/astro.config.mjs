// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
    integrations: [
        starlight({
            title: 'DolphJS',
            customCss: [
                './src/styles/custom.css'
            ],
            social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/dolphjs/dolph' }],
            sidebar: [
                {
                    label: 'Getting Started',
                    link: '/getting-started/',
                },
                {
                    label: 'Core Concepts',
                    items: [{ autogenerate: { directory: 'core-concepts' } }],
                },
                {
                    label: 'Guides',
                    items: [{ autogenerate: { directory: 'guides' } }],
                },
                {
                    label: 'Reference',
                    items: [{ autogenerate: { directory: 'reference' } }],
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
