import { defineRouteMiddleware } from '@astrojs/starlight/route-data';
import type { StarlightRouteData } from '@astrojs/starlight/route-data';
import { isV2Page } from './versions';

type SidebarEntry = StarlightRouteData['sidebar'][number];
type SidebarLink = Extract<SidebarEntry, { type: 'link' }>;

const flatten = (entries: SidebarEntry[]): SidebarLink[] =>
	entries.flatMap((entry) => (entry.type === 'link' ? [entry] : flatten(entry.entries)));

// Starlight has one sidebar, so both versions are configured as top-level groups and
// each page keeps only its own. Pagination has to follow, or it would cross versions.
export const onRequest = defineRouteMiddleware(({ locals }) => {
	const route = locals.starlightRoute;
	const label = isV2Page(route.id) ? 'v2' : 'v3';
	const group = route.sidebar.find((entry) => entry.type === 'group' && entry.label === label);

	if (group?.type !== 'group') return;

	route.sidebar = group.entries;

	const links = flatten(group.entries);
	const current = links.findIndex((link) => link.isCurrent);

	route.pagination = {
		prev: current > 0 ? links[current - 1] : undefined,
		next: current >= 0 ? links[current + 1] : undefined,
	};
});
