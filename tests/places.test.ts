import { moveShortcut, reorderCategories } from '../features/places/operations';
import { validData, timestamp } from './fixtures';

describe('place organization', () => {
  it('moves a shortcut between categories and normalizes both lists', () => {
    const data = validData();
    data.categories.push({ id: 'cat_2', name: 'Work', order: 1, collapsed: false, createdAt: timestamp, updatedAt: timestamp });
    data.shortcuts.push({ id: 'place_2', name: 'Second', url: 'https://two.test/', categoryId: 'cat_2', order: 0, createdAt: timestamp, updatedAt: timestamp });
    const moved = moveShortcut(data, 'place_1', 'cat_2', 0);
    expect(moved.shortcuts.filter((item) => item.categoryId === 'cat_1')).toEqual([]);
    expect(moved.shortcuts.filter((item) => item.categoryId === 'cat_2').sort((a, b) => a.order - b.order).map((item) => item.id)).toEqual(['place_1', 'place_2']);
  });

  it('reorders categories and persists normalized positions', () => {
    const data = validData();
    data.categories.push(
      { id: 'cat_2', name: 'Socials', order: 1, collapsed: false, createdAt: timestamp, updatedAt: timestamp },
      { id: 'cat_3', name: 'Projects', order: 2, collapsed: false, createdAt: timestamp, updatedAt: timestamp },
    );

    const moved = reorderCategories(data, 'cat_3', 'cat_1');

    expect([...moved.categories].sort((a, b) => a.order - b.order).map((category) => category.id)).toEqual(['cat_3', 'cat_1', 'cat_2']);
    expect([...moved.categories].sort((a, b) => a.order - b.order).map((category) => category.order)).toEqual([0, 1, 2]);
  });
});
