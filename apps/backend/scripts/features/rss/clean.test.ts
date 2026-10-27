import { describe, expect, it } from 'vitest';

import {
  buildPushTitle,
  buildTeaser,
  cleanDescription,
  cleanHeadline,
  normalizeText,
  removeBoilerplate,
  stripHtml,
} from './clean';

describe('normalizeText', () => {
  it('collapses CRLF and excessive blank lines', () => {
    expect(normalizeText('a\r\nb\r\n\r\n\r\nc')).toBe('a\nb\n\nc');
  });

  it('collapses inline whitespace but keeps paragraph breaks', () => {
    expect(normalizeText('hello   world\n\n\n\nnext   line')).toBe('hello world\n\nnext line');
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalizeText('   padded   \n   text   ')).toBe('padded\ntext');
  });

  it('normalizes NBSP and removes zero-width chars', () => {
    expect(normalizeText('hello\u00A0world\u200Btest')).toBe('hello worldtest');
  });
});

describe('stripHtml', () => {
  it('converts block tags and <br> into paragraph breaks', () => {
    const html =
      '<p>First paragraph.</p><p>Second <strong>bold</strong> paragraph.</p>Item one<br />Item two';
    const text = stripHtml(html);
    expect(text).toContain('\n\n');
    expect(text).not.toContain('<p>');
    expect(text).not.toContain('<br');
    expect(text).toMatch(/First paragraph/);
    expect(text).toMatch(/Second bold paragraph/);
    expect(text).toMatch(/Item one\nItem two/);
  });

  it('drops script and style contents', () => {
    const html =
      '<p>Keep this.</p><script>var x = 1;</script><style>.x{color:red}</style><p>Also keep.</p>';
    const text = stripHtml(html);
    expect(text).toContain('Keep this.');
    expect(text).toContain('Also keep.');
    expect(text).not.toContain('var x');
    expect(text).not.toContain('color:red');
  });

  it('keeps adjacent paragraph sentences from running together', () => {
    const html = '<p>First sentence.</p><p>Second sentence.</p>';
    expect(stripHtml(html)).toBe('First sentence.\n\nSecond sentence.');
  });
});

describe('removeBoilerplate', () => {
  it('removes published date metadata lines', () => {
    const text =
      'Nvidia announced the RTX 6090 today.\n\nPublished Oct 23, 2026, 10:30 AM EDT\n\nMore details.';
    const cleaned = removeBoilerplate(text);
    expect(cleaned).toContain('Nvidia announced the RTX 6090 today.');
    expect(cleaned).not.toContain('Published Oct 23');
    expect(cleaned).toContain('More details.');
  });

  it('removes trailing published sentences', () => {
    const text =
      'Nvidia announced the RTX 6090 today. Published Oct 23, 2026, 10:30 AM EDT. The specs look great.';
    const cleaned = removeBoilerplate(text);
    expect(cleaned).toContain('Nvidia announced the RTX 6090 today.');
    expect(cleaned).not.toContain('Published Oct 23');
    expect(cleaned).toContain('The specs look great.');
  });

  it('keeps legitimate sentences that mention published in a different context', () => {
    const text = 'The game was published in 2020 by a small studio and found a cult following.';
    expect(removeBoilerplate(text)).toBe(text);
  });

  it('removes bylines, photo credits, read more and wordpress footer', () => {
    const text =
      'Story body goes here.\n\nBy John Smith\n\nPhoto Credit: Getty Images\n\nRead more: Related stories\n\nThe post Story body goes here appeared first on Example Site.';
    const cleaned = removeBoilerplate(text);
    expect(cleaned).toContain('Story body goes here.');
    expect(cleaned).not.toContain('By John Smith');
    expect(cleaned).not.toContain('Photo Credit');
    expect(cleaned).not.toContain('Read more');
    expect(cleaned).not.toContain('appeared first on');
  });

  it('removes image credits without colons', () => {
    const text =
      'Mario Kart World is now available.\n\nImage by GameRant\n\nImage: Nintendo\n\nImage: Nintendo via GameRant\n\nThe game features new tracks.';
    const cleaned = removeBoilerplate(text);
    expect(cleaned).toContain('Mario Kart World is now available.');
    expect(cleaned).toContain('The game features new tracks.');
    expect(cleaned).not.toContain('Image by GameRant');
    expect(cleaned).not.toContain('Image: Nintendo');
    expect(cleaned).not.toContain('via GameRant');
  });

  it('removes UI artifacts', () => {
    const text =
      'Breaking news about gaming.\n\nFollow\n\nLink copied to clipboard\n\nThis is the actual story content.';
    const cleaned = removeBoilerplate(text);
    expect(cleaned).toContain('Breaking news about gaming.');
    expect(cleaned).toContain('This is the actual story content.');
    expect(cleaned).not.toContain('Follow');
    expect(cleaned).not.toContain('Link copied to clipboard');
  });

  it('removes auth prompts', () => {
    const text =
      'Game review content here.\n\nSign in to your GameRant account\n\nMore review content.';
    const cleaned = removeBoilerplate(text);
    expect(cleaned).toContain('Game review content here.');
    expect(cleaned).toContain('More review content.');
    expect(cleaned).not.toContain('Sign in to your GameRant account');
  });

  it('removes metadata labels', () => {
    const text = 'Game description here.\n\nSystems\n\nReleased\n\nDeveloper(s)\n\nPublisher(s)';
    const cleaned = removeBoilerplate(text);
    expect(cleaned).toContain('Game description here.');
    expect(cleaned).not.toContain('Systems');
    expect(cleaned).not.toContain('Released');
    expect(cleaned).not.toContain('Developer(s)');
    expect(cleaned).not.toContain('Publisher(s)');
  });

  it('removes author bios', () => {
    const text =
      'Article content.\n\nAndrea is an editor at GameRant, where she has been writing professionally about video games for over five years.\n\nShe has over 8,000 hours in Path of Exile.\n\nAndrea has a BA in Psychology from 2015.\n\nOne of Andrea\'s favorite articles for GameRant is about predictions.\n\nMore article content.';
    const cleaned = removeBoilerplate(text);
    expect(cleaned).toContain('Article content.');
    expect(cleaned).toContain('More article content.');
    expect(cleaned).not.toContain('Andrea is an editor');
    expect(cleaned).not.toContain('8,000 hours');
    expect(cleaned).not.toContain('BA in Psychology');
    expect(cleaned).not.toContain('favorite articles');
  });

  it('keeps legitimate content that mentions hours or degrees', () => {
    const text =
      'The game offers over 100 hours of gameplay. Players can earn a degree in alchemy within the game world.';
    expect(removeBoilerplate(text)).toBe(text);
  });

  it('keeps legitimate content about following or signing in game mechanics', () => {
    const text = 'Follow the quest marker to find the treasure. Sign in blood to complete the ritual.';
    expect(removeBoilerplate(text)).toBe(text);
  });

  it('keeps dates mentioned in article context', () => {
    const text =
      'The game was released on June 5, 2025, and received critical acclaim. E3 2025 had the biggest reveal yet.';
    expect(removeBoilerplate(text)).toBe(text);
  });

  it('keeps content ratings mentioned in article text', () => {
    const text = 'The game received an Everyone rating and is suitable for all ages.';
    expect(removeBoilerplate(text)).toBe(text);
  });

  it('keeps image references in article content', () => {
    const text =
      'The image shows Mario racing through a colorful track. This image demonstrates the new graphics engine.';
    expect(removeBoilerplate(text)).toBe(text);
  });
});

describe('cleanDescription', () => {
  it('strips HTML, removes boilerplate and dedupes the title', () => {
    const html =
      '<p>Big Game News</p><p>Big Game News</p><p>Nvidia announced the RTX 6090.</p><p>Published Oct 23, 2026, 10:30 AM EDT</p><p>The performance is impressive.</p>';
    const cleaned = cleanDescription(html, { title: 'Big Game News' });
    expect(cleaned).toContain('Nvidia announced the RTX 6090.');
    expect(cleaned).toContain('The performance is impressive.');
    expect(cleaned).not.toContain('Published Oct 23');
    expect((cleaned.match(/Big Game News/g) || []).length).toBe(0);
    expect(cleaned).toContain('\n\n');
  });

  it('keeps paragraph breaks from adjacent p tags', () => {
    const html = '<p>First.</p><p>Second.</p>';
    expect(cleanDescription(html)).toBe('First.\n\nSecond.');
  });
});

describe('buildTeaser', () => {
  it('returns a single line within 150 chars at a word boundary', () => {
    const text =
      'This is a very long article description that goes on and on about many different things including games and hardware updates.';
    const teaser = buildTeaser(text, 150);
    expect(teaser).not.toContain('\n');
    expect(teaser.length).toBeLessThanOrEqual(150);
    expect(teaser.endsWith('...')).toBe(false);
    expect(teaser).not.toMatch(/\s$/);
  });
});

describe('cleanHeadline', () => {
  it('removes site suffix only when it matches', () => {
    expect(cleanHeadline('Nvidia RTX 6090 Review | TechPowerUp', { siteName: 'TechPowerUp' })).toBe(
      'Nvidia RTX 6090 Review',
    );
    expect(cleanHeadline('Nvidia RTX 6090 Review | TechPowerUp', { siteName: 'Other Site' })).toBe(
      'Nvidia RTX 6090 Review | TechPowerUp',
    );
  });

  it('removes byline only with separator', () => {
    expect(cleanHeadline('Exclusive Reveal - By John Doe')).toBe('Exclusive Reveal');
    expect(cleanHeadline('Patch Notes | Written by Jane')).toBe('Patch Notes');
    expect(cleanHeadline('How to Play By Ear')).toBe('How to Play By Ear');
  });

  it('normalizes html entities and newlines', () => {
    expect(cleanHeadline('Big&nbsp;News<br>Title')).toBe('Big News Title');
  });
});

describe('buildPushTitle', () => {
  it('truncates at a word boundary', () => {
    const long =
      'This is an extremely long headline that should be truncated without cutting a word in the middle';
    const title = buildPushTitle(long, { maxChars: 40 });
    expect(title.length).toBeLessThanOrEqual(40);
    expect(title).not.toMatch(/\s$/);
  });
});
