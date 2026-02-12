import { describe, it, expect } from 'vitest';
import { searchEmoji, categories, allEmoji, type EmojiEntry } from './emoji';

describe('searchEmoji', () => {
	it('returns all emoji for empty query', () => {
		expect(searchEmoji('')).toBe(allEmoji);
	});

	it('returns all emoji for whitespace-only query', () => {
		expect(searchEmoji('   ')).toBe(allEmoji);
	});

	it('finds emoji by name', () => {
		const results = searchEmoji('grinning face');
		expect(results.length).toBeGreaterThan(0);
		expect(results.every((e) => e.name.includes('grinning face'))).toBe(true);
	});

	it('finds emoji by keyword', () => {
		const results = searchEmoji('happy');
		expect(results.length).toBeGreaterThan(0);
		// All results should have 'happy' in name or keywords
		for (const e of results) {
			const matchesName = e.name.toLowerCase().includes('happy');
			const matchesKeyword = e.keywords.some((k) => k.toLowerCase().includes('happy'));
			expect(matchesName || matchesKeyword).toBe(true);
		}
	});

	it('is case-insensitive', () => {
		const lower = searchEmoji('robot');
		const upper = searchEmoji('ROBOT');
		const mixed = searchEmoji('Robot');
		expect(lower).toEqual(upper);
		expect(lower).toEqual(mixed);
	});

	it('returns empty array when no match', () => {
		const results = searchEmoji('zzzznonexistentemoji');
		expect(results).toEqual([]);
	});

	it('finds fire emoji by keyword "lit"', () => {
		const results = searchEmoji('lit');
		const fire = results.find((e) => e.emoji === '\u{1F525}');
		expect(fire).toBeDefined();
	});

	it('trims query whitespace', () => {
		const trimmed = searchEmoji('robot');
		const padded = searchEmoji('  robot  ');
		expect(trimmed).toEqual(padded);
	});
});

describe('categories', () => {
	it('has expected category names', () => {
		const names = categories.map((c) => c.name);
		expect(names).toContain('Smileys');
		expect(names).toContain('People');
		expect(names).toContain('Nature');
		expect(names).toContain('Food');
		expect(names).toContain('Activities');
		expect(names).toContain('Travel');
		expect(names).toContain('Objects');
		expect(names).toContain('Symbols');
	});

	it('has 8 categories', () => {
		expect(categories).toHaveLength(8);
	});

	it('every category has at least one emoji', () => {
		for (const cat of categories) {
			expect(cat.emoji.length).toBeGreaterThan(0);
		}
	});

	it('every emoji entry has required fields', () => {
		for (const entry of allEmoji) {
			expect(typeof entry.emoji).toBe('string');
			expect(entry.emoji.length).toBeGreaterThan(0);
			expect(typeof entry.name).toBe('string');
			expect(entry.name.length).toBeGreaterThan(0);
			expect(Array.isArray(entry.keywords)).toBe(true);
			expect(entry.keywords.length).toBeGreaterThan(0);
		}
	});

	it('allEmoji is the flat union of all categories', () => {
		const manual = categories.flatMap((c) => c.emoji);
		expect(allEmoji).toEqual(manual);
	});
});
