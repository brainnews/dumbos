/**
 * ModuleRegistry - Register and manage modules
 */
class ModuleRegistry {
  constructor() {
    this.modules = new Map();
  }

  /**
   * Register a module
   * @param {Object} module - Module object with id, title, icon, init, render, destroy
   */
  register(module) {
    if (!module.id) {
      throw new Error('Module must have an id');
    }

    if (this.modules.has(module.id)) {
      console.warn(`Module ${module.id} already registered, overwriting`);
    }

    this.modules.set(module.id, module);
    return this;
  }

  /**
   * Get a module by ID
   */
  get(moduleId) {
    return this.modules.get(moduleId);
  }

  /**
   * Get all registered modules
   */
  getAll() {
    return Array.from(this.modules.values());
  }

  /**
   * Get modules by category
   * @param {string} category - Category name
   * @returns {Array} Modules in the category
   */
  getByCategory(category) {
    return this.getAll().filter(m => m.category === category);
  }

  /**
   * Get all categories with their modules
   * @returns {Object} Map of category -> modules[]
   */
  getCategories() {
    const categories = {};
    this.getAll().forEach(module => {
      const cat = module.category || 'other';
      if (!categories[cat]) {
        categories[cat] = [];
      }
      categories[cat].push(module);
    });
    return categories;
  }

  /**
   * Check if a module is registered
   */
  has(moduleId) {
    return this.modules.has(moduleId);
  }

  /**
   * Unregister a module
   */
  unregister(moduleId) {
    return this.modules.delete(moduleId);
  }
}

export default new ModuleRegistry();
