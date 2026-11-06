// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

const docsSections = ({ isCurrent }) => {
    const root = isCurrent ? '' : 'v2/';
    const page = (label, slug) => ({ label, link: `/${root}${slug}/` });
    const group = (label, directory) => ({
        label,
        items: [{ autogenerate: { directory: `${root}${directory}` } }],
    });

    return [
        page('Getting Started', 'getting-started'),
        page('Examples', 'examples'),
        group('Core Concepts', 'core-concepts'),
        group('Techniques', 'techniques'),
        group('MVC', 'mvc'),
        page('Architecture', 'architecture'),
        page('Config', 'config'),
        page('CLI', 'cli'),
        page('Testing', 'testing'),
        ...(isCurrent ? [page('Benchmarks', 'benchmarks')] : []),
        page('GraphQL', 'graphql'),
        page('Websockets', 'websockets'),
    ];
};

// https://astro.build/config
export default defineConfig({
    site: 'https://dolphjs.com',
    integrations: [
        starlight({
            title: 'DolphJS',
            description: 'The New-Age, developer-friendly Node.js framework for building scalable enterprise applications.',
            logo: {
                light: './src/assets/logo-light.svg',
                dark: './src/assets/logo-dark.svg',
                alt: '',
            },
            favicon: '/favicon.svg',
            head: [
                { tag: 'link', attrs: { rel: 'icon', href: '/favicon.ico', sizes: '48x48' } },
                { tag: 'link', attrs: { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' } },
                { tag: 'link', attrs: { rel: 'manifest', href: '/site.webmanifest' } },
                { tag: 'meta', attrs: { name: 'msapplication-config', content: '/browserconfig.xml' } },
                { tag: 'meta', attrs: { name: 'theme-color', content: '#071A22' } },
                { tag: 'meta', attrs: { property: 'og:image', content: '/dolphjs-tile-1024.png' } },
                { tag: 'meta', attrs: { property: 'twitter:image', content: '/dolphjs-tile-1024.png' } },
            ],
            expressiveCode: {
                themes: ['one-dark-pro'],
                styleOverrides: {
                    borderRadius: '0.5rem',
                },
            },
            customCss: ['./src/styles/custom.css'],
            social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/dolphjs/dolph' }],
            components: {
                SiteTitle: './src/components/SiteTitle.astro',
                PageTitle: './src/components/PageTitle.astro',
            },
            routeMiddleware: './src/route-data.ts',
            // Each page only keeps the group for its own version. See src/route-data.ts.
            sidebar: [
                { label: 'v3', items: docsSections({ isCurrent: true }) },
                { label: 'v2', items: docsSections({ isCurrent: false }) },
            ],
        }),
    ],
});
