export const V2_ROOT = 'v2';

export const isV2Page = (id: string) => id === V2_ROOT || id.startsWith(`${V2_ROOT}/`);

/** The content id of a page, in the version it isn't in. */
export const counterpartId = (id: string) => {
	if (isV2Page(id)) return id === V2_ROOT ? '' : id.slice(V2_ROOT.length + 1);

	return id ? `${V2_ROOT}/${id}` : V2_ROOT;
};

export const hrefFor = (id: string) => (id ? `/${id}/` : '/');
