// Plugin System Architecture for AuraCast
// Enables extensible data sources and custom widgets

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  homepage?: string;
  repository?: string;
  license?: string;
  keywords?: string[];
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  main: string;
  types?: string;
  activationEvents?: string[];
  contributes?: PluginContributions;
  engines?: {
    node?: string;
    browser?: string;
  };
}

export interface PluginContributions {
  dataSources?: DataSourceContribution[];
  widgets?: WidgetContribution[];
  commands?: CommandContribution[];
  menus?: MenuContribution[];
  themes?: ThemeContribution[];
  languages?: LanguageContribution[];
}

export interface DataSourceContribution {
  id: string;
  name: string;
  description: string;
  type: 'api' | 'websocket' | 'file' | 'database' | 'custom';
  schema: DataSourceSchema;
  settings?: SettingDefinition[];
}

export interface DataSourceSchema {
  properties: Record<string, PropertyDefinition>;
  required?: string[];
}

export interface PropertyDefinition {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  default?: any;
  enum?: string[];
  format?: string;
  items?: PropertyDefinition;
  properties?: Record<string, PropertyDefinition>;
}

export interface WidgetContribution {
  id: string;
  name: string;
  description: string;
  component: string;
  category: string;
  icon?: string;
  size: {
    default: 'small' | 'medium' | 'large' | 'full';
    min?: 'small' | 'medium' | 'large';
    max?: 'small' | 'medium' | 'large' | 'full';
  };
  settings?: SettingDefinition[];
  dataSources?: string[];
}

export interface CommandContribution {
  id: string;
  title: string;
  category?: string;
  icon?: string;
  command: string;
  when?: string;
}

export interface MenuContribution {
  id: string;
  menu: string;
  command: string;
  when?: string;
  group?: string;
}

export interface ThemeContribution {
  id: string;
  label: string;
  uiTheme: 'vs' | 'vs-dark' | 'hc-black';
  path: string;
}

export interface LanguageContribution {
  id: string;
  aliases?: string[];
  extensions?: string[];
  filenames?: string[];
  firstLine?: string;
  configuration?: string;
}

export interface SettingDefinition {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  title: string;
  description?: string;
  default?: any;
  enum?: string[];
  enumDescriptions?: string[];
  minimum?: number;
  maximum?: number;
  items?: SettingDefinition;
  properties?: Record<string, SettingDefinition>;
}

// Plugin Runtime Interfaces
export interface PluginContext {
  subscriptions: Disposable[];
  globalState: Map<string, any>;
  workspaceState: Map<string, any>;
  secrets: Map<string, string>;
  extensionPath: string;
  extensionUri: string;
  log: (message: string, level?: 'info' | 'warn' | 'error') => void;
}

export interface DataSourceInstance {
  id: string;
  name: string;
  type: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  query(query: any): Promise<any>;
  subscribe(callback: (data: any) => void): Disposable;
  getSchema(): DataSourceSchema;
  getSettings(): Record<string, any>;
  updateSettings(settings: Record<string, any>): void;
}

export interface WidgetInstance {
  id: string;
  name: string;
  component: React.ComponentType<any>;
  size: string;
  settings: Record<string, any>;
  dataSources: string[];
  render(props: any): React.ReactElement;
  onSettingsChange(settings: Record<string, any>): void;
  dispose(): void;
}

export interface Disposable {
  dispose(): void;
}

// Plugin Manager Class
export class PluginManager {
  private plugins: Map<string, PluginInstance> = new Map();
  private dataSources: Map<string, DataSourceInstance> = new Map();
  private widgets: Map<string, WidgetInstance> = new Map();
  private commands: Map<string, CommandHandler> = new Map();
  private eventEmitter: EventEmitter = new EventEmitter();

  constructor() {
    this.initializeBuiltInPlugins();
  }

  private initializeBuiltInPlugins(): void {
    // Register built-in data sources
    this.registerBuiltInDataSources();
    this.registerBuiltInWidgets();
  }

  private registerBuiltInDataSources(): void {
    // AQI Data Source
    const aqiDataSource: DataSourceInstance = {
      id: 'builtin.aqi',
      name: 'AQI Data',
      type: 'api',
      async connect() { /* Implementation */ },
      async disconnect() { /* Implementation */ },
      async query(query: any) { /* Implementation */ },
      subscribe(callback: (data: any) => void) { /* Implementation */ return { dispose: () => {} }; },
      getSchema() { /* Implementation */ return { properties: {} }; },
      getSettings() { return {}; },
      updateSettings(settings: Record<string, any>) { /* Implementation */ },
    };
    this.dataSources.set(aqiDataSource.id, aqiDataSource);

    // Weather Data Source
    const weatherDataSource: DataSourceInstance = {
      id: 'builtin.weather',
      name: 'Weather Data',
      type: 'api',
      async connect() { /* Implementation */ },
      async disconnect() { /* Implementation */ },
      async query(query: any) { /* Implementation */ },
      subscribe(callback: (data: any) => void) { /* Implementation */ return { dispose: () => {} }; },
      getSchema() { /* Implementation */ return { properties: {} }; },
      getSettings() { return {}; },
      updateSettings(settings: Record<string, any>) { /* Implementation */ },
    };
    this.dataSources.set(weatherDataSource.id, weatherDataSource);
  }

  private registerBuiltInWidgets(): void {
    // Built-in widgets are registered in the DynamicDashboard component
  }

  async loadPlugin(manifest: PluginManifest, pluginCode: string): Promise<void> {
    try {
      // Create plugin context
      const context: PluginContext = {
        subscriptions: [],
        globalState: new Map(),
        workspaceState: new Map(),
        secrets: new Map(),
        extensionPath: '',
        extensionUri: '',
        log: (message: string, level: 'info' | 'warn' | 'error' = 'info') => {
          console[level](`[${manifest.name}] ${message}`);
        },
      };

      // Execute plugin code in isolated context
      const pluginModule = await this.executePluginCode(pluginCode, context);

      // Create plugin instance
      const pluginInstance: PluginInstance = {
        manifest,
        context,
        module: pluginModule,
        activated: false,
      };

      // Register contributions
      if (manifest.contributes) {
        await this.registerContributions(manifest.contributes, pluginInstance);
      }

      this.plugins.set(manifest.id, pluginInstance);

      // Activate plugin if it has activation events
      if (manifest.activationEvents?.includes('*') || manifest.activationEvents?.includes('onStartup')) {
        await this.activatePlugin(manifest.id);
      }

      this.eventEmitter.emit('pluginLoaded', manifest.id);
    } catch (error) {
      console.error(`Failed to load plugin ${manifest.name}:`, error);
      throw error;
    }
  }

  private async executePluginCode(code: string, context: PluginContext): Promise<any> {
    // Create isolated execution context
    const exports: any = {};

    // Plugin API functions
    const pluginAPI = {
      registerDataSource: (contribution: DataSourceContribution, factory: () => DataSourceInstance) => {
        // Implementation for registering data source
      },
      registerWidget: (contribution: WidgetContribution, factory: () => WidgetInstance) => {
        // Implementation for registering widget
      },
      registerCommand: (contribution: CommandContribution, handler: CommandHandler) => {
        // Implementation for registering command
      },
    };

    // Execute plugin code
    const func = new Function('exports', 'require', 'context', 'api', code);
    func(exports, this.createRequire(), context, pluginAPI);

    return exports;
  }

  private createRequire(): (moduleId: string) => any {
    // Mock require function for plugins
    return (moduleId: string) => {
      // Handle common module requests
      switch (moduleId) {
        case 'react':
          return React;
        case 'convex/react':
          return { useQuery: () => null, useMutation: () => () => {} };
        default:
          throw new Error(`Module ${moduleId} not found`);
      }
    };
  }

  private async registerContributions(contributions: PluginContributions, plugin: PluginInstance): Promise<void> {
    // Register data sources
    if (contributions.dataSources) {
      for (const ds of contributions.dataSources) {
        // Implementation for registering data source contributions
      }
    }

    // Register widgets
    if (contributions.widgets) {
      for (const widget of contributions.widgets) {
        // Implementation for registering widget contributions
      }
    }

    // Register commands
    if (contributions.commands) {
      for (const cmd of contributions.commands) {
        // Implementation for registering command contributions
      }
    }
  }

  async activatePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || plugin.activated) return;

    try {
      if (plugin.module.activate) {
        await plugin.module.activate(plugin.context);
      }
      plugin.activated = true;
      this.eventEmitter.emit('pluginActivated', pluginId);
    } catch (error) {
      console.error(`Failed to activate plugin ${pluginId}:`, error);
      throw error;
    }
  }

  async deactivatePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || !plugin.activated) return;

    try {
      if (plugin.module.deactivate) {
        await plugin.module.deactivate(plugin.context);
      }

      // Dispose subscriptions
      plugin.context.subscriptions.forEach(sub => sub.dispose());

      plugin.activated = false;
      this.eventEmitter.emit('pluginDeactivated', pluginId);
    } catch (error) {
      console.error(`Failed to deactivate plugin ${pluginId}:`, error);
      throw error;
    }
  }

  getDataSource(id: string): DataSourceInstance | undefined {
    return this.dataSources.get(id);
  }

  getWidget(id: string): WidgetInstance | undefined {
    return this.widgets.get(id);
  }

  getAllDataSources(): DataSourceInstance[] {
    return Array.from(this.dataSources.values());
  }

  getAllWidgets(): WidgetInstance[] {
    return Array.from(this.widgets.values());
  }

  getPlugin(id: string): PluginInstance | undefined {
    return this.plugins.get(id);
  }

  getAllPlugins(): PluginInstance[] {
    return Array.from(this.plugins.values());
  }

  on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }
}

// Plugin Instance Interface
export interface PluginInstance {
  manifest: PluginManifest;
  context: PluginContext;
  module: any;
  activated: boolean;
}

// Command Handler Type
export type CommandHandler = (args?: any) => any | Promise<any>;

// Event Emitter (simple implementation)
class EventEmitter {
  private listeners: Map<string, Function[]> = new Map();

  on(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  off(event: string, listener: Function): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event: string, ...args: any[]): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(...args));
    }
  }
}

// React import (will be available at runtime)
declare const React: any;

// Singleton instance
let pluginManager: PluginManager | null = null;

export function getPluginManager(): PluginManager {
  if (!pluginManager) {
    pluginManager = new PluginManager();
  }
  return pluginManager;
}

export function disposePluginManager(): void {
  if (pluginManager) {
    // Deactivate all plugins
    for (const plugin of pluginManager.getAllPlugins()) {
      if (plugin.activated) {
        pluginManager.deactivatePlugin(plugin.manifest.id);
      }
    }
    pluginManager = null;
  }
}