/**
 * Data IPC Module
 * Handles dictionary, snippets, notes, and personas-related IPC calls
 */

const path = require('path');
const fs = require('fs');

class DataIPC {
  constructor(options = {}) {
    this.ipcMain = options.ipcMain;
    this.app = options.app;
    this.__dirname = options.__dirname;
    this.windowManager = options.windowManager;
    this.settings = options.settings;

    this.dictionaryPath = path.join(this.__dirname, 'data', 'dictionary.json');
    this.snippetsPath = path.join(this.__dirname, 'data', 'snippets.json');
    this.profilesPath = path.join(this.__dirname, 'data', 'profiles.json');
    this.notesPath = path.join(this.__dirname, 'data', 'notes.json');
  }

  register() {
    this.registerDictionaryHandlers();
    this.registerSnippetsHandlers();
    this.registerPersonasHandlers();
    this.registerNotesHandlers();
  }

  registerDictionaryHandlers() {
    this.ipcMain.handle('dictionary:get', async () => {
      try {
        if (fs.existsSync(this.dictionaryPath)) {
          return JSON.parse(fs.readFileSync(this.dictionaryPath, 'utf8'));
        }
        return [];
      } catch (e) {
        return [];
      }
    });

    this.ipcMain.handle('dictionary:add', async (_evt, word) => {
      try {
        let words = fs.existsSync(this.dictionaryPath)
          ? JSON.parse(fs.readFileSync(this.dictionaryPath, 'utf8'))
          : [];
        
        // Validate input type and length
        if (typeof word !== 'string') {
          return { success: false, words, error: 'Invalid word type' };
        }
        
        const normalizedWord = word.toLowerCase().trim();
        if (!normalizedWord) {
          return { success: false, words, error: 'Please enter a valid word' };
        }
        
        if (normalizedWord.length > 100) {
          return { success: false, words, error: 'Word must be less than 100 characters' };
        }

        const normalizedWords = words.map(w => String(w).toLowerCase().trim());
        if (normalizedWords.includes(normalizedWord)) {
          return { success: false, words, error: `"${word}" already exists` };
        }

        words.push(normalizedWord);
        words.sort();
        fs.writeFileSync(this.dictionaryPath, JSON.stringify(words, null, 2));
        return { success: true, words };
      } catch (e) {
        console.error('Error adding word to dictionary:', e);
        return { success: false, words: [], error: e.message };
      }
    });

    this.ipcMain.handle('dictionary:delete', async (_evt, word) => {
      try {
        let words = fs.existsSync(this.dictionaryPath) 
          ? JSON.parse(fs.readFileSync(this.dictionaryPath, 'utf8')) 
          : [];
        words = words.filter(w => w !== word.toLowerCase().trim());
        fs.writeFileSync(this.dictionaryPath, JSON.stringify(words, null, 2));
        return words;
      } catch (e) {
        return [];
      }
    });
  }

  registerSnippetsHandlers() {
    this.ipcMain.handle('snippets:get', async () => {
      try {
        return fs.existsSync(this.snippetsPath) 
          ? JSON.parse(fs.readFileSync(this.snippetsPath, 'utf8')) 
          : [];
      } catch (e) {
        return [];
      }
    });

    this.ipcMain.handle('snippets:add', async (_evt, snippet) => {
      try {
        // Validate input
        if (!snippet || typeof snippet !== 'object') {
          return { success: false, error: 'Invalid snippet data' };
        }
        
        // Validate text field
        if (snippet.text && typeof snippet.text !== 'string') {
          return { success: false, error: 'Text must be a string' };
        }
        if (snippet.text && snippet.text.length > 10000) {
          return { success: false, error: 'Snippet text too long (max 10,000 characters)' };
        }
        
        // Validate title field
        if (snippet.title && typeof snippet.title !== 'string') {
          return { success: false, error: 'Title must be a string' };
        }
        if (snippet.title && snippet.title.length > 200) {
          return { success: false, error: 'Title too long (max 200 characters)' };
        }
        
        let snippets = fs.existsSync(this.snippetsPath) 
          ? JSON.parse(fs.readFileSync(this.snippetsPath, 'utf8')) 
          : [];
        
        const newSnippet = {
          id: Date.now().toString(),
          title: snippet.title || 'Untitled',
          text: snippet.text || '',
          trigger: snippet.trigger || '',
          timestamp: Date.now()
        };
        
        snippets.unshift(newSnippet);
        fs.writeFileSync(this.snippetsPath, JSON.stringify(snippets, null, 2));
        return { success: true, snippets };
      } catch (e) {
        console.error('Error adding snippet:', e);
        return { success: false, error: e.message };
      }
    });

    this.ipcMain.handle('snippets:delete', async (_evt, id) => {
      try {
        let snippets = fs.existsSync(this.snippetsPath) 
          ? JSON.parse(fs.readFileSync(this.snippetsPath, 'utf8')) 
          : [];
        snippets = snippets.filter(s => s.id !== id);
        fs.writeFileSync(this.snippetsPath, JSON.stringify(snippets, null, 2));
        return snippets;
      } catch (e) {
        return [];
      }
    });
  }

  registerPersonasHandlers() {
    this.ipcMain.handle('personas:get', async () => {
      try {
        if (fs.existsSync(this.profilesPath)) {
          const data = JSON.parse(fs.readFileSync(this.profilesPath, 'utf8'));
          return { personas: data.personas || [], activePersona: data.activePersona || null };
        }
        return { personas: [], activePersona: null };
      } catch (e) {
        return { personas: [], activePersona: null };
      }
    });

    this.ipcMain.handle('personas:set-active', async (_evt, personaId) => {
      try {
        let data = fs.existsSync(this.profilesPath) 
          ? JSON.parse(fs.readFileSync(this.profilesPath, 'utf8')) 
          : { personas: [], activePersona: null };

        const persona = (data.personas || []).find(p => p.id === personaId);
        if (!persona) return { success: false, error: 'Persona not found' };

        if (persona.settings) {
          if (persona.settings.activeModel) this.settings.activeModel = persona.settings.activeModel;
          if (persona.settings.flowRefinement !== undefined) this.settings.flowRefinement = persona.settings.flowRefinement;
        }

        data.activePersona = personaId;
        fs.writeFileSync(this.profilesPath, JSON.stringify(data, null, 2));
        return { success: true, persona, appliedSettings: persona.settings };
      } catch (e) {
        return { success: false, error: e.message };
      }
    });
  }

  registerNotesHandlers() {
    this.ipcMain.handle('notes:get', async () => {
      try {
        return fs.existsSync(this.notesPath) 
          ? JSON.parse(fs.readFileSync(this.notesPath, 'utf8')) 
          : [];
      } catch (e) {
        return [];
      }
    });

    this.ipcMain.handle('notes:add', async (_evt, note) => {
      try {
        // Validate input
        if (!note || typeof note !== 'object') {
          return { success: false, error: 'Invalid note data' };
        }
        
        // Validate text field
        if (note.text && typeof note.text !== 'string') {
          return { success: false, error: 'Text must be a string' };
        }
        if (note.text && note.text.length > 50000) {
          return { success: false, error: 'Note text too long (max 50,000 characters)' };
        }
        
        let notes = fs.existsSync(this.notesPath) 
          ? JSON.parse(fs.readFileSync(this.notesPath, 'utf8')) 
          : [];
        
        const newNote = {
          id: Date.now().toString(),
          text: note.text || '',
          timestamp: Date.now()
        };
        
        notes.unshift(newNote);
        fs.writeFileSync(this.notesPath, JSON.stringify(notes, null, 2));
        return { success: true, notes };
      } catch (e) {
        console.error('Error adding note:', e);
        return { success: false, error: e.message };
      }
    });

    this.ipcMain.handle('notes:delete', async (_evt, id) => {
      try {
        let notes = fs.existsSync(this.notesPath) 
          ? JSON.parse(fs.readFileSync(this.notesPath, 'utf8')) 
          : [];
        notes = notes.filter(n => n.id !== id);
        fs.writeFileSync(this.notesPath, JSON.stringify(notes, null, 2));
        return notes;
      } catch (e) {
        return [];
      }
    });
  }
}

module.exports = DataIPC;
