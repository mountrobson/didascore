export const playerHref = (id: string | undefined, league?: string) => (id ? `/player/soccer/${league || 'all'}/${id}` : '');
