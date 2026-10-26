import { describe, expect, it } from 'vitest';
import {
  MAX_GAME_IDS,
  mapSteamAppIds,
  normalizeSteamRequirements,
  parseGameIds,
  parseSpecHtmlToRows,
  steamAppIdFromWebsites,
} from './pcRequirementsHelpers.js';
import { normalizePcgwTitle, parseSystemrequirements } from './pcgwClient.js';

describe('parseGameIds', () => {
  it('parses, dedupes and validates ids', () => {
    expect(parseGameIds('1, 2,2, 300, -5, nope, 0')).toEqual([1, 2, 300]);
  });

  it('accepts repeated query parameters', () => {
    expect(parseGameIds(['4', '5,6'])).toEqual([4, 5, 6]);
  });

  it('caps the request size', () => {
    const ids = Array.from({ length: 60 }, (_, index) => index + 1).join(',');
    expect(parseGameIds(ids)).toHaveLength(MAX_GAME_IDS);
  });

  it('ignores non-string input', () => {
    expect(parseGameIds(undefined)).toEqual([]);
    expect(parseGameIds(null)).toEqual([]);
    expect(parseGameIds({})).toEqual([]);
  });
});

describe('steamAppIdFromWebsites', () => {
  it('returns the store app id', () => {
    expect(
      steamAppIdFromWebsites([
        { type: 1, url: 'https://example.com' },
        { type: 13, url: 'https://store.steampowered.com/app/1091500/cyberpunk_2077/' },
      ]),
    ).toBe('1091500');
  });

  it('returns null for missing or malformed Steam links', () => {
    expect(steamAppIdFromWebsites(undefined)).toBeNull();
    expect(steamAppIdFromWebsites([{ type: 13, url: 'https://store.steampowered.com/' }])).toBeNull();
    expect(steamAppIdFromWebsites([{ type: 13, url: null }])).toBeNull();
  });
});

describe('mapSteamAppIds', () => {
  it('maps every IGDB id, including games without a Steam page', () => {
    const result = mapSteamAppIds([
      {
        id: 10,
        websites: [{ type: 13, url: 'https://store.steampowered.com/app/123/' }],
      },
      { id: 20, websites: [{ type: 1, url: 'https://example.com' }] },
      { id: 30 },
    ]);

    expect(result.get(10)).toBe('123');
    expect(result.get(20)).toBeNull();
    expect(result.get(30)).toBeNull();
  });

  it('tolerates a malformed payload', () => {
    expect(mapSteamAppIds(null).size).toBe(0);
    expect(mapSteamAppIds([null, { id: 'x' }]).size).toBe(0);
  });
});

describe('normalizeSteamRequirements', () => {
  it('keeps the usual object shape', () => {
    expect(
      normalizeSteamRequirements({ minimum: '<p>Min</p>', recommended: '<p>Rec</p>' }),
    ).toEqual({ minimum: '<p>Min</p>', recommended: '<p>Rec</p>' });
  });

  it('accepts the legacy string shape', () => {
    expect(normalizeSteamRequirements('<p>Min</p>')).toEqual({
      minimum: '<p>Min</p>',
      recommended: null,
    });
  });

  it('drops empty tiers', () => {
    expect(normalizeSteamRequirements({ minimum: '  ' })).toBeNull();
    expect(normalizeSteamRequirements({})).toBeNull();
    expect(normalizeSteamRequirements(null)).toBeNull();
    expect(normalizeSteamRequirements(42)).toBeNull();
  });
});

describe('parseSpecHtmlToRows', () => {
  it('parses Steam\'s HTML requirement blob into rows', () => {
    const html =
      '<ul><li><strong>OS:</strong> Windows 10</li>' +
      '<li><strong>Processor:</strong> Intel Core i5-8400</li>' +
      '<li><strong>Memory:</strong> 12 GB RAM</li></ul>';
    expect(parseSpecHtmlToRows(html)).toEqual([
      { label: 'OS', value: 'Windows 10' },
      { label: 'Processor', value: 'Intel Core i5-8400' },
      { label: 'Memory', value: '12 GB RAM' },
    ]);
  });

  it('drops additional-notes rows and unescapes entities', () => {
    const html = '<li>Additional Notes: *</li><li>Graphics:&nbsp;GTX &amp; RX</li>';
    expect(parseSpecHtmlToRows(html)).toEqual([{ label: 'Graphics', value: 'GTX & RX' }]);
  });

  it('tolerates non-string input', () => {
    expect(parseSpecHtmlToRows(undefined)).toEqual([]);
    expect(parseSpecHtmlToRows(null)).toEqual([]);
    expect(parseSpecHtmlToRows(42)).toEqual([]);
  });
});

// Fixtures are condensed from real PCGamingWiki pages (Elden Ring, Hades,
// Cyberpunk 2077) so the parser is exercised against the actual template
// shapes: dual CPU/GPU alternatives, multi-OS pages, alt spec blocks and
// citation-laden notes.
const ELDEN_RING_WIKITEXT = `{{System requirements
|OSfamily = Windows

|minOS    = 10
|minCPU   = Intel Core i5-8400
|minCPU2  = AMD Ryzen 3 3300X
|minRAM   = 12 GB
|minHD    = 60 GB
|minGPU   = Nvidia GeForce GTX 1060
|minGPU2  = AMD Radeon RX 580
|minVRAM  = 3 GB (Nvidia), 4 GB (AMD)
|minDX    = 12

|recOS    = 10, 11
|recCPU   = Intel Core i7-8700K
|recCPU2  = AMD Ryzen 5 3600X
|recRAM   = 16 GB
|recHD    =
|recGPU   = Nvidia GeForce GTX 1070
|recGPU2  = AMD Radeon RX Vega 56
|recVRAM  = 8 GB
|notes    = {{ii}} A 64-bit operating system is required.
}}
{{ii}} The game will run on Intel Core 2 processors, despite the minimum processor requirements.<ref>{{Refurl|url=https://example.com|title=x|date=May 2023}}</ref>`;

const HADES_WIKITEXT = `{{System requirements
|OSfamily = Windows

|minOS    = 7 SP1
|minCPU   = 2.4 GHz Dual Core
|minRAM   = 4 GB
|minHD    = 15 GB
|minGPU   =
|minVRAM  = 1 GB
|minOGL   =
|minDX    = 10

|recOS    =
|recCPU   = 3.0 GHz Dual Core
|recRAM   = 8 GB
|recHD    = 20 GB
|recGPU   =
|recVRAM  = 2 GB
|notes    =
}}

{{System requirements
|OSfamily = OS X
|minOS    = 10.13.6
|minCPU   = 2.4 GHz Dual Core
|minRAM   = 4 GB
|minHD    = 15 GB
|minGPU   = Intel HD Graphics 5000

|recOS    = 10.14
|recCPU   = 3.0 GHz Quad Core
|recRAM   = 8 GB
|recHD    = 20 GB
|recGPU   = Intel UHD Graphics 630
}}

{{References}}`;

const CYBERPUNK_WIKITEXT = `{{System requirements
|OSfamily = Windows

|minTGT   = 1080p, Low @ 30 FPS
|minOS    = 10
|minCPU   = Intel Core i7-6700
|minCPU2  = AMD Ryzen 5 1600
|minRAM   = 12 GB
|minHD    = 70 GB (SSD)
|minGPU   = Nvidia GeForce GTX 1060
|minGPU2  = AMD Radeon RX 580
|minGPU3  = Intel Arc A380
|minVRAM  = 6 GB
|minDX    = 12

|recTGT   = 1080p, High @ 60 FPS
|recOS    =
|recCPU   = Intel Core i7-12700
|recCPU2  = AMD Ryzen 7 7800X3D
|recRAM   = 16 GB
|recHD    = 70 GB (SSD)
|recGPU   = Nvidia GeForce RTX 2060 Super
|recGPU2  = AMD Radeon RX 5700 XT
|recGPU3  = Intel Arc A770
|recVRAM  = 8 GB
|recDX    =

|alt1Title = RT Minimum
|alt1TGT   = 1080p, RT Low @ 30 FPS
|alt1CPU   = Intel Core i7-9700
|alt1RAM   = 16 GB
|alt1GPU   = Nvidia GeForce RTX 2060
|alt1VRAM  = 8 GB

|alt2Title = RT Ultra
|alt2CPU   = Intel Core i9-12900
|alt2GPU   = Nvidia GeForce RTX 3080 Ti
|alt2VRAM  = 12 GB
|notes    = {{ii}} System requirements were increased with the release of Update 2.0.<ref name="1.5 notes">[https://example.com Patch notes]</ref>
}}`;

describe('normalizePcgwTitle', () => {
  it('strips trademark marks and collapses whitespace', () => {
    expect(normalizePcgwTitle('  PAYDAY 2™\n')).toBe('payday 2');
    expect(normalizePcgwTitle('The Sims™ 4®')).toBe('the sims 4');
  });

  it('tolerates non-string input', () => {
    expect(normalizePcgwTitle(undefined)).toBe('');
    expect(normalizePcgwTitle(null)).toBe('');
    expect(normalizePcgwTitle(42)).toBe('');
  });
});

describe('parseSystemrequirements', () => {
  it('parses Elden Ring: alternatives joined, vendor VRAM list skipped', () => {
    expect(parseSystemrequirements(ELDEN_RING_WIKITEXT)).toEqual({
      minimum: [
        { label: 'OS', value: 'Windows 10' },
        { label: 'Processor', value: 'Intel Core i5-8400 or AMD Ryzen 3 3300X' },
        { label: 'Memory', value: '12 GB' },
        { label: 'Storage', value: '60 GB' },
        { label: 'Graphics', value: 'Nvidia GeForce GTX 1060 or AMD Radeon RX 580' },
        { label: 'DirectX', value: '12' },
      ],
      recommended: [
        { label: 'OS', value: 'Windows 10, 11' },
        { label: 'Processor', value: 'Intel Core i7-8700K or AMD Ryzen 5 3600X' },
        { label: 'Memory', value: '16 GB' },
        { label: 'Graphics', value: 'Nvidia GeForce GTX 1070 or AMD Radeon RX Vega 56 (8 GB VRAM)' },
      ],
    });
  });

  it('parses Hades: prefers the Windows template, skips empty specs', () => {
    const result = parseSystemrequirements(HADES_WIKITEXT);
    expect(result.minimum).toEqual([
      { label: 'OS', value: 'Windows 7 SP1' },
      { label: 'Processor', value: '2.4 GHz Dual Core' },
      { label: 'Memory', value: '4 GB' },
      { label: 'Storage', value: '15 GB' },
      { label: 'DirectX', value: '10' },
    ]);
    expect(result.recommended).toEqual([
      { label: 'Processor', value: '3.0 GHz Dual Core' },
      { label: 'Memory', value: '8 GB' },
      { label: 'Storage', value: '20 GB' },
    ]);
  });

  it('parses Cyberpunk 2077: third GPU alternative and RT tiers', () => {
    const result = parseSystemrequirements(CYBERPUNK_WIKITEXT);
    expect(result.minimum).toEqual([
      { label: 'OS', value: 'Windows 10' },
      { label: 'Processor', value: 'Intel Core i7-6700 or AMD Ryzen 5 1600' },
      { label: 'Memory', value: '12 GB' },
      { label: 'Storage', value: '70 GB (SSD)' },
      { label: 'Graphics', value: 'Nvidia GeForce GTX 1060 or AMD Radeon RX 580 or Intel Arc A380 (6 GB VRAM)' },
      { label: 'DirectX', value: '12' },
    ]);
    expect(result.recommended).toEqual([
      { label: 'Processor', value: 'Intel Core i7-12700 or AMD Ryzen 7 7800X3D' },
      { label: 'Memory', value: '16 GB' },
      { label: 'Storage', value: '70 GB (SSD)' },
      { label: 'Graphics', value: 'Nvidia GeForce RTX 2060 Super or AMD Radeon RX 5700 XT or Intel Arc A770 (8 GB VRAM)' },
    ]);
    // alt1*/alt2* are exposed as their own tiers, never merged into min/rec.
    expect(result.rtMinimum).toEqual([
      { label: 'Processor', value: 'Intel Core i7-9700' },
      { label: 'Memory', value: '16 GB' },
      { label: 'Graphics', value: 'Nvidia GeForce RTX 2060 (8 GB VRAM)' },
    ]);
    expect(result.rtUltra).toEqual([
      { label: 'Processor', value: 'Intel Core i9-12900' },
      { label: 'Graphics', value: 'Nvidia GeForce RTX 3080 Ti (12 GB VRAM)' },
    ]);
    expect(JSON.stringify(result.minimum)).not.toContain('3080');
    expect(JSON.stringify(result.recommended)).not.toContain('3080');
  });

  it('returns null for pages without a template', () => {
    expect(parseSystemrequirements('Just prose, no template here.')).toBeNull();
    expect(parseSystemrequirements('')).toBeNull();
    expect(parseSystemrequirements(undefined)).toBeNull();
  });

  it('returns null when a template exists but carries no specs', () => {
    expect(
      parseSystemrequirements('{{System requirements\n|OSfamily = Windows\n|notes = {{ii}} None published.\n}}'),
    ).toBeNull();
  });

  it('cleans wiki links and refs out of values', () => {
    const wikitext = `{{System requirements
|OSfamily = Windows
|minCPU   = [[Intel Core i5-8400|i5-8400]]
|minRAM   = 8 GB
|minHD    = 20 GB
|minGPU   = Nvidia GeForce GTX 1060{{refn|group}}<ref>old</ref>
}}`;
    expect(parseSystemrequirements(wikitext)).toEqual({
      minimum: [
        { label: 'Processor', value: 'i5-8400' },
        { label: 'Memory', value: '8 GB' },
        { label: 'Storage', value: '20 GB' },
        { label: 'Graphics', value: 'Nvidia GeForce GTX 1060' },
      ],
      recommended: [],
    });
  });
});
