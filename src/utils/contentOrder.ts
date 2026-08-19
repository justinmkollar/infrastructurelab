import displayOrder from '../data/display-order.json';

type OrderedGroup = keyof typeof displayOrder;
type CollectionEntryLike = {
  id: string;
  data: Record<string, any>;
};

function keyFromPath(value = '') {
  const filename = String(value).split('/').pop() || '';
  return filename.replace(/\.[^.]+$/, '');
}

function entryKey(entry: CollectionEntryLike) {
  return keyFromPath(entry.id);
}

export function sortByDisplayOrder<T extends CollectionEntryLike>(
  entries: T[],
  group: OrderedGroup,
  label: (entry: T) => string
) {
  const configured = (displayOrder[group] || []).map((item) => keyFromPath(item.entry));
  const positions = new Map(configured.map((key, index) => [key, index]));

  return [...entries].sort((a, b) => {
    const aPosition = positions.get(entryKey(a));
    const bPosition = positions.get(entryKey(b));
    const aListed = aPosition !== undefined;
    const bListed = bPosition !== undefined;

    if (aListed && bListed) return aPosition - bPosition;
    if (aListed) return -1;
    if (bListed) return 1;

    // Newly created entries are never hidden just because they have not yet
    // been placed in the drag-order editor. They append predictably until the
    // editor positions them.
    return label(a).localeCompare(label(b));
  });
}
