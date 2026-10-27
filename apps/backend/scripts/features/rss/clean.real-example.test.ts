import { describe, expect, it } from 'vitest';
import { cleanDescription } from './clean';

describe('cleanDescription - real GameRant example', () => {
  it('removes all unwanted metadata from actual GameRant article', () => {
    const rawContent = `Image by GameRant

Follow

Link copied to clipboard

Andrea is an editor at GameRant, where she has been writing professionally about video games for over five years. She became a gamer for life at 8, thanks to a copy of Pokemon Red and her Game Boy. Her passion for RPGs, TCGs, and MMOs was combined with work when she came across GameRant in 2021, when she started her career in video game writing.

Andrea has an obscene amount of hours in Path of Exile (almost 8,000 on Steam), over 3,500 hours in Destiny 2, over 1,500 hours in The Elder Scrolls Online, and probably around 11,000 hours in Pokemon games, which she always completes the Pokedex of and tries to fill the shiny Pokedex too. Additionally, she has 100% completion in multiple RPGs of various kinds, like Borderlands 2 and 3, Oblivion (and Oblivion Remastered), Skyrim, and Fallout: New Vegas. She plays MMOs religiously (especially World of Warcraft, Destiny 2, and The Elder Scrolls Online), and she has vast experience of playing and building decks for Magic: The Gathering, Pokemon TCG Pocket, and Disney Lorcana.

Andrea has extensive professional experience as a translator and ghostwriter. She has a BA in Psychology from 2015, a Master's Degree in Communication & Translation from 2016, and a Master's Degree in Copywriting & Advertising from 2019.

One of Andrea's favorite articles for GameRant is a prediction of Pokemon Violet probably outselling Pokemon Scarlet, which is what eventually happened. One of the articles she's most proud of is about The Last of Us 2's Ellie and the game's perpetual cycle of revenge.

Sign in to your GameRant account

Fans have hacked the Nintendo Switch 2, and a well-known emulator developer has now created a playable PC version of Mario Kart World. There have already been multiple games released exclusively for the Nintendo Switch 2 so far, including big hits like Pokemon Pokopia and Donkey Kong Bananza, and soon Pokemon Winds and Waves and The Legend of Zelda: Ocarina of Time Remake will also launch for Switch 2. Mario Kart World was a launch title for the console, and more content for it is rumored for 2027.

Things have been quite still for the game for some time now. Mario Kart World received an update in September 2026, called Version 1.0.8. The update added new courses inspired by the original Super Mario Kart for the SNES, though they're only available in VS Race Mode. Rumors state that there will be new DLC coming out next year, possibly featuring a Star Fox crossover, though nothing has been officially confirmed so far. A new Indie World Showcase will take place tomorrow, though it's very unlikely to feature any news about first-party titles.

Switch 2 Exclusive Mario Kart World Now Playable on PC

Renowned emulator developer Will Faust on Twitter shared a post showing Mario Kart World gameplay on macOS, stating that this is real footage. According to the user, this was done via nxnative fork, with Faust working mainly on NVN2 support and on syscalls or other conversions. The game uses different shaders and is missing some geometry, but it's actually a functional version of the most recent entry in the Mario Kart series on PC. The developer also claims in a comment that they can achieve an iOS port in the next few hours as well. Some have asked for a Windows port, but Faust stated that someone else could do that. Some fans are skeptical of the accomplishment and believe it could be malware, and others are encouraging Faust to get a lawyer for when Nintendo does something about this.

Image: Nintendo

Image: Nintendo via GameRant

Though the Switch 2 has been hacked, the current exploit can be patched, so it may be a matter of time before Nintendo fixes it. Still, if fans manage to dump game files and assets before then, more game ports could pop up online. This exploit doesn't apply to future games, and it doesn't allow datamining for currently unreleased titles. What follows is that there won't be new Pokemon Winds and Waves leaks, for example, and no future game releases on Switch 2 can be identified at this stage.

Interestingly, there was a new Mario Kart 8 Deluxe update in October 2026, making the Switch 1 game more recently updated than the Switch 2 exclusive. Whether a new Mario Kart World release will indeed launch in 2027 remains to be seen.

However, many rumors are pointing to a new 3D Mario game in 2027, possibly coming between September and November. These rumors have not been confirmed or debunked, as Nintendo hasn't announced a new Mario game yet.

Systems

Released

June 5, 2025

ESRB

Everyone // Mild Fantasy Violence, Users Interact

Developer(s)

Nintendo

Publisher(s)`;

    const cleaned = cleanDescription(rawContent, { title: 'Mario Kart World' });

    // Should keep the actual article content
    expect(cleaned).toContain('Fans have hacked the Nintendo Switch 2');
    expect(cleaned).toContain('playable PC version of Mario Kart World');
    expect(cleaned).toContain('Will Faust on Twitter');
    expect(cleaned).toContain('nxnative fork');
    expect(cleaned).toContain('new 3D Mario game in 2027');

    // Should remove UI artifacts
    expect(cleaned).not.toContain('Image by GameRant');
    expect(cleaned).not.toContain('Follow');
    expect(cleaned).not.toContain('Link copied to clipboard');

    // Should remove author bio
    expect(cleaned).not.toContain('Andrea is an editor');
    expect(cleaned).not.toContain('8,000 on Steam');
    expect(cleaned).not.toContain('BA in Psychology');
    expect(cleaned).not.toContain('favorite articles for GameRant');
    expect(cleaned).not.toContain('most proud of');

    // Should remove auth prompts
    expect(cleaned).not.toContain('Sign in to your GameRant account');

    // Should remove image attributions
    expect(cleaned).not.toContain('Image: Nintendo');
    expect(cleaned).not.toContain('via GameRant');

    // Should remove metadata labels
    expect(cleaned).not.toContain('Systems');
    expect(cleaned).not.toContain('Released');
    expect(cleaned).not.toContain('June 5, 2025');
    expect(cleaned).not.toContain('Developer(s)');
    expect(cleaned).not.toContain('Publisher(s)');
    expect(cleaned).not.toContain('ESRB');
  });
});
