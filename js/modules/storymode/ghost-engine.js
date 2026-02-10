/**
 * Ghost Engine - Generates haunting narratives via Claude API and populates module storage
 */
import Storage from '../../core/storage.js';
import { FALLBACK_NARRATIVES } from './fallback-narratives.js';

const GHOST_SYSTEM_PROMPT = `You are creating a haunting narrative for DumbOS, a desktop environment, told through digital artifacts left behind by a previous user.

Generate a unique character who used this desktop environment obsessively. They discovered or created something that consumed them. They left traces.

Output ONLY valid JSON with this exact structure:
{
  "character": {
    "name": "string (first name only or alias)",
    "occupation": "string",
    "obsession": "string (what consumed them)",
    "fate": "string (1 sentence, what happened to them)"
  },
  "notes": [
    { "title": "string", "content": "string", "dayOffset": -30 },
    { "title": "string", "content": "string", "dayOffset": -14 },
    { "title": "string", "content": "string", "dayOffset": -7 },
    { "title": "string", "content": "string", "dayOffset": -3 },
    { "title": "string", "content": "string", "dayOffset": -1 }
  ],
  "documents": [
    {
      "title": "string (main research document)",
      "content": "string (longer piece, 300+ words, markdown formatted, trails off mid-sentence)"
    },
    {
      "title": "string (journal entry, letter, or secondary document)",
      "content": "string (shorter piece, 100-200 words, adds personal dimension to the story)"
    }
  ],
  "bookmarks": [
    { "name": "string (website title)", "url": "string (plausible URL)" }
  ],
  "synthPatternName": "string (eerie 2-3 word name for a music pattern)",
  "finalMessage": "string (cryptic warning left for whoever finds this desktop)"
}

RULES:
- Notes should progress from normal/mundane to increasingly unsettling
- Include 2 writing documents: one longer research/work piece that trails off, one shorter personal piece (journal, unsent letter, etc.)
- Note content should be plain text, 2-6 sentences each
- Include 4-6 bookmarks that are REAL, verifiable URLs the character would have researched.
  Use a MIX of sources (~50% Wikipedia, ~50% other reputable sites):
  - Wikipedia articles (use real article names that exist)
  - Academic/research sites (arXiv, university pages, Stanford Encyclopedia)
  - Professional tools/resources (product pages, documentation)
  - Reference sites (Wolfram MathWorld, official docs)
  CRITICAL: Only use URLs you are confident exist. When in doubt, use Wikipedia.
  DO NOT invent fake Reddit threads, fake article paths, or placeholder URLs.
  Good examples:
  - https://en.wikipedia.org/wiki/Infrasound (real Wikipedia)
  - https://mathworld.wolfram.com/CellularAutomaton.html (real reference)
  - https://plato.stanford.edu/entries/emergence/ (real encyclopedia)
- The tone should be unsettling and mysterious, hinting at something wrong without being graphic
- Each generation should be a COMPLETELY different character, story, and obsession
- The story should feel like discovering someone's abandoned digital life
- dayOffset is negative days from "now" when the note was supposedly written`;

const GhostEngine = {
  /**
   * Generate a narrative - tries Claude API first, falls back to pre-written stories
   */
  async generateNarrative(onStatus) {
    const apiKey = Storage.get('claude-api', 'apiKey', null);

    if (apiKey) {
      try {
        if (onStatus) onStatus('Reaching into the void...');
        return await this._generateFromAPI(apiKey);
      } catch (err) {
        console.warn('Ghost Engine: API failed, using fallback', err);
        if (onStatus) onStatus('Shadows coalescing...');
        return this._getRandomFallback();
      }
    }

    if (onStatus) onStatus('Shadows coalescing...');
    return this._getRandomFallback();
  },

  /**
   * Call Claude API to generate a unique narrative
   */
  async _generateFromAPI(apiKey) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: GHOST_SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: 'Generate a unique haunting narrative. Make this character and story completely original.'
        }]
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || 'API request failed');
    }

    const content = data.content[0].text;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No valid JSON in response');

    const narrative = JSON.parse(jsonMatch[0]);

    if (!narrative.character || !narrative.notes || !narrative.documents) {
      throw new Error('Incomplete narrative structure');
    }

    return narrative;
  },

  /**
   * Pick a random fallback narrative
   */
  _getRandomFallback() {
    const index = Math.floor(Math.random() * FALLBACK_NARRATIVES.length);
    return FALLBACK_NARRATIVES[index];
  },

  /**
   * Backup all user data before entering story mode
   */
  backupUserData() {
    const backup = {};
    const prefix = 'dumbos:';

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(prefix) && !key.startsWith('dumbos:storymode:')) {
        backup[key] = localStorage.getItem(key);
      }
    }

    Storage.set('storymode', 'backup', backup);
  },

  /**
   * Restore user data from backup
   */
  restoreUserData() {
    const backup = Storage.get('storymode', 'backup', null);
    if (!backup) return false;

    // Clear all non-storymode keys first
    const prefix = 'dumbos:';
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(prefix) && !key.startsWith('dumbos:storymode:')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

    // Restore backed up data
    for (const [key, value] of Object.entries(backup)) {
      localStorage.setItem(key, value);
    }

    // Clear storymode data
    const storyKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('dumbos:storymode:')) {
        storyKeys.push(key);
      }
    }
    storyKeys.forEach(key => localStorage.removeItem(key));

    return true;
  },

  /**
   * Populate ghost content into module storage from a narrative
   */
  populateRemnants(narrative) {
    const now = Date.now();
    const DAY = 86400000;

    // Clear existing module data that we'll replace
    Storage.clear('notes');
    Storage.clear('writing');
    Storage.clear('rss');
    Storage.clear('bookmarks');
    Storage.clear('desktop');

    // Populate Notes
    const ghostNotes = narrative.notes.map((note, i) => ({
      id: `ghost_${i}_${Date.now().toString(36)}`,
      title: note.title,
      content: note.content,
      ghost: true,
      createdAt: now + (note.dayOffset * DAY),
      updatedAt: now + (note.dayOffset * DAY)
    }));

    // Add the final message as the most recent note
    if (narrative.finalMessage) {
      ghostNotes.push({
        id: `ghost_final_${Date.now().toString(36)}`,
        title: 'TO WHOEVER FINDS THIS',
        content: narrative.finalMessage,
        ghost: true,
        createdAt: now - (DAY / 2),
        updatedAt: now - (DAY / 2)
      });
    }

    Storage.set('notes', 'notes', ghostNotes);

    // Populate Writing documents
    const ghostDocs = narrative.documents.map((doc, i) => ({
      id: `ghost_doc_${i}_${Date.now().toString(36)}`,
      title: doc.title,
      content: doc.content,
      ghost: true,
      createdAt: now - ((10 - i * 3) * DAY),
      updatedAt: now - ((2 + i) * DAY)
    }));

    Storage.set('writing', 'documents', ghostDocs);

    // Populate Bookmarks with desktop positions
    if (narrative.bookmarks && narrative.bookmarks.length > 0) {
      const bookmarksWithPositions = narrative.bookmarks.map((b, i) => ({
        name: b.name,
        url: b.url,
        x: 20,  // First column
        y: 20 + (i * 100)  // Stack vertically
      }));
      Storage.set('bookmarks', 'list', bookmarksWithPositions);
      Storage.set('bookmarks', 'showOnDesktop', true);
    } else {
      Storage.set('bookmarks', 'list', []);
      Storage.set('bookmarks', 'showOnDesktop', false);
    }

    // Clear RSS feeds (empty state)
    Storage.set('rss', 'feeds', []);

    // Clear desktop shortcuts (empty state)
    Storage.set('desktop', 'shortcuts', []);

    // Populate Synth pattern
    if (narrative.synthPatternName) {
      const eeriePattern = this._generateEeriePattern();
      const ghostPattern = {
        id: `ghost_synth_${Date.now().toString(36)}`,
        name: narrative.synthPatternName,
        tempo: 85,
        waveform: 'sine',
        melodicPattern: eeriePattern.melodicPattern,
        drumPattern: eeriePattern.drumPattern,
        ghost: true,
        createdAt: now - (5 * DAY),
        updatedAt: now - (1 * DAY)
      };

      Storage.set('synth', 'savedPatterns', [ghostPattern]);
    }

    // Store story state
    Storage.set('storymode', 'active', true);
    Storage.set('storymode', 'character', narrative.character);
    Storage.set('storymode', 'startedAt', now);
  },

  /**
   * Generate an eerie-sounding synth pattern
   */
  _generateEeriePattern() {
    // Sparse, dissonant melodic pattern using minor intervals
    const melodicPattern = Array(8).fill(null).map(() => Array(16).fill(false));

    // Use notes that create tension: C4, E4(b), F4, B4 (tritone with F)
    // Row indices: 0=C5, 1=B4, 2=A4, 3=G4, 4=F4, 5=E4, 6=D4, 7=C4
    const eerieNotes = [
      [7, 0],   // C4 on step 0
      [4, 3],   // F4 on step 3
      [1, 4],   // B4 on step 4 (tritone with F)
      [7, 6],   // C4 on step 6
      [5, 8],   // E4 on step 8
      [2, 10],  // A4 on step 10
      [4, 12],  // F4 on step 12
      [1, 14],  // B4 on step 14
      [7, 15],  // C4 on step 15
    ];

    eerieNotes.forEach(([row, step]) => {
      melodicPattern[row][step] = true;
    });

    // Sparse, irregular drum pattern
    const drumPattern = Array(3).fill(null).map(() => Array(16).fill(false));

    // Kick on odd beats - irregular
    drumPattern[0][0] = true;
    drumPattern[0][7] = true;
    drumPattern[0][12] = true;

    // Snare - sparse, off-grid
    drumPattern[1][4] = true;
    drumPattern[1][11] = true;

    // Hi-hat - stuttering
    drumPattern[2][0] = true;
    drumPattern[2][2] = true;
    drumPattern[2][3] = true;
    drumPattern[2][8] = true;
    drumPattern[2][10] = true;
    drumPattern[2][11] = true;

    return { melodicPattern, drumPattern };
  }
};

export default GhostEngine;
