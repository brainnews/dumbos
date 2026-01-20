/**
 * Storage - localStorage wrapper with namespacing
 */
const Storage = {
  PREFIX: 'dumbos',

  /**
   * Build a namespaced key
   */
  _key(namespace, key) {
    return `${this.PREFIX}:${namespace}:${key}`;
  },

  /**
   * Get a value from storage
   */
  get(namespace, key, defaultValue = null) {
    try {
      const stored = localStorage.getItem(this._key(namespace, key));
      if (stored === null) return defaultValue;
      return JSON.parse(stored);
    } catch (e) {
      console.warn('Storage.get failed:', e);
      return defaultValue;
    }
  },

  /**
   * Set a value in storage
   */
  set(namespace, key, value) {
    try {
      localStorage.setItem(this._key(namespace, key), JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn('Storage.set failed:', e);
      return false;
    }
  },

  /**
   * Remove a value from storage
   */
  remove(namespace, key) {
    try {
      localStorage.removeItem(this._key(namespace, key));
      return true;
    } catch (e) {
      console.warn('Storage.remove failed:', e);
      return false;
    }
  },

  /**
   * Get all keys for a namespace
   */
  keys(namespace) {
    const prefix = `${this.PREFIX}:${namespace}:`;
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(prefix)) {
        keys.push(key.slice(prefix.length));
      }
    }
    return keys;
  },

  /**
   * Clear all data for a namespace
   */
  clear(namespace) {
    const keys = this.keys(namespace);
    keys.forEach(key => this.remove(namespace, key));
  },

  /**
   * Create a namespaced storage interface for a module
   */
  module(moduleId) {
    return {
      get: (key, defaultValue) => Storage.get(moduleId, key, defaultValue),
      set: (key, value) => Storage.set(moduleId, key, value),
      remove: (key) => Storage.remove(moduleId, key),
      keys: () => Storage.keys(moduleId),
      clear: () => Storage.clear(moduleId)
    };
  }
};

export default Storage;
