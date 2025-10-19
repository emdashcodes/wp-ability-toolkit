# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WP Ability Toolkit is a WordPress plugin development toolkit with integrated AI agent testing. It's a pnpm monorepo containing:

1. **WordPress Plugin** (`packages/wp-ability-toolkit`) - WordPress plugin with PHP backend and React frontend for testing WordPress Abilities with AI agents
2. **AI SDK Bridge** (`packages/agenttic-ai-sdk-bridge`) - TypeScript package connecting WordPress REST API to Agenttic UI
3. **Claude Code Marketplace Skills** (`claude-code-plugins/`) - Skills for WordPress development (Ability scaffolding, plugin scaffolding, wp-env management)

## Technology Stack

- **Backend**: WordPress PHP (namespaced classes in `WP_Ability_Toolkit\`)
- **Frontend**: React + TypeScript using `@wordpress/element` and `@automattic/agenttic-ui`
- **Build**: `@wordpress/scripts` for plugin, TypeScript compiler for bridge
- **Dev Environment**: `@wordpress/env` (Docker-based WordPress on port 8888)
- **Dependencies**: WordPress Abilities API via Composer, pnpm workspace for npm packages

## Common Development Commands

### Environment Setup

```bash
# Install all dependencies (run from root)
pnpm install

# Install PHP dependencies (WordPress Abilities API)
cd packages/wp-ability-toolkit
composer install
```

### Development Workflow

```bash
# Start WordPress environment (http://localhost:8888/wp-admin)
# Login: admin / password
pnpm env:start

# Start development mode (webpack watch for hot-reloading)
pnpm start

# Build all packages for production
pnpm build

# Build individual packages
pnpm build:bridge   # Build agenttic-ai-sdk-bridge only
pnpm build:plugin   # Build wp-ability-toolkit only
```

### Testing

```bash
# Run linting
pnpm lint

# Type checking
pnpm type-check

# PHPUnit tests (from plugin directory)
cd packages/wp-ability-toolkit
vendor/bin/phpunit
```

### Environment Management

```bash
# Stop WordPress environment
pnpm env:stop

# Clean WordPress environment (removes all data)
pnpm env:clean
```

## Architecture & Key Files

### PHP Backend Architecture

**Main Plugin File**: `packages/wp-ability-toolkit/wp-ability-toolkit.php`

- Loads Composer autoloader for WordPress Abilities API
- Sets up autoloader for namespaced classes (`WP_Ability_Toolkit\`)
- Initializes plugin via `Plugin::get_instance()`

**Class Structure** (`packages/wp-ability-toolkit/includes/`):

- `class-plugin.php` - Main singleton, orchestrates initialization
- `class-settings.php` - Manages plugin settings (provider, API key, model)
- `class-rest-api.php` - REST endpoints (`/chat`, `/settings`)
- `class-anthropic-client.php` - Anthropic API integration with streaming
- `class-openai-client.php` - OpenAI API integration with streaming
- `class-ability-tools-manager.php` - Manages WordPress Abilities as AI tools
- `class-prompt.php` - System prompt generation with context

**Naming Convention**: Class files use `class-` prefix with lowercase-hyphenated names. Classes use underscores (`Ability_Tools_Manager`), file is `class-ability-tools-manager.php`.

### Frontend Architecture

**Bridge Package** (`packages/agenttic-ai-sdk-bridge/src/`):

- `index.ts` - Main exports
- `useWordPressChat.ts` - React hook for WordPress chat integration
- `streamAdapter.ts` - Server-Sent Events parsing
- `types.ts` - TypeScript interfaces

**Plugin Frontend** (`packages/wp-ability-toolkit/src/`):

- `chat-widget/` - Admin chat widget (React, appears in bottom-right)
- `admin/` - Settings page React components
- `abilities/` - Client-side WordPress Abilities (TypeScript)
  - `get-browser-info.ts` - Example client-side ability
  - `navigate.ts` - Navigation ability for WordPress admin
  - `index.ts` - Ability registration

### WordPress Abilities Integration

The plugin demonstrates the WordPress Abilities API:

- **Server-side abilities**: Registered in `class-plugin.php::register_test_abilities()`
- **Client-side abilities**: TypeScript files in `src/abilities/`, bundled via webpack
- **Categories**: Registered via `abilities_api_categories_init` hook
- **Hook for custom abilities**: `wp_ability_toolkit_register_abilities` (testing only)

**Important**: This hook is for testing/debugging. Production abilities should be in separate plugins.

### REST API Endpoints

**POST `/wp-json/wp-ability-toolkit/v1/chat`**

- Handles streaming chat via Server-Sent Events
- Accepts `messages`, `clientContext`, `clientAbilities`
- Returns SSE stream: `data: {"delta": "text"}` or `data: {"done": true}`
- Integrates with Anthropic/OpenAI and WordPress Abilities as tools

**GET/POST `/wp-json/wp-ability-toolkit/v1/settings`**

- Manages plugin configuration (requires `manage_options`)
- Provider (openai/anthropic), model, encrypted API key

## WordPress Environment Configuration

`.wp-env.json` mounts the plugin from `packages/wp-ability-toolkit`:

- Main site: <http://localhost:8888> (admin/password)
- Test site: <http://localhost:8889>
- WP_DEBUG enabled in development

## pnpm Workspace Structure

`pnpm-workspace.yaml` defines packages in `packages/*`:

- Workspace protocol (`workspace:*`) links bridge to plugin
- Commands with `-r` flag run in all packages
- Filter commands with `--filter <package-name>`

## WordPress Abilities API

Loaded via Composer from `wordpress/abilities-api:dev-release/0.3`. The plugin:

1. Registers Abilities API assets via `WP_Abilities_Assets_Init`
2. Converts registered abilities into AI tools (via `Ability_Tools_Manager`)
3. Provides both server-side (PHP) and client-side (TypeScript) ability examples

## Build System

**Plugin**: Uses `@wordpress/scripts` which configures webpack for multiple entry points:

- `src/chat-widget/index.tsx` → `build/chat-widget/index.js`
- `src/admin/settings.tsx` → `build/admin/settings.js`
- TypeScript abilities are bundled into the main widget

**Bridge**: Standalone TypeScript compilation to `dist/`

## Development Notes

- **Composer First**: Run `composer install` in plugin directory before building
- **Hot Reload**: `pnpm start` watches files; refresh browser to see changes
- **API Keys**: Stored encrypted in WordPress options (`wp_ability_toolkit_api_key`)
- **Abilities Bundling**: Client abilities in `src/abilities/` are webpack entry points
- **Error Handling**: REST API includes detailed error mapping (auth, rate limits)
- **PHPCS**: `.phpcs.xml.dist` configured for WordPress coding standards

## Claude Code Marketplace Skills

Available for WordPress development workflows:

- `wordpress-ability-api` - Scaffold and validate WordPress Abilities
- `wordpress-plugin-scaffold` - WP-CLI plugin scaffolding
- `wp-env` - Environment management (start/stop/WP-CLI commands)

Install via: `/plugin marketplace add emdashcodes/wp-ability-toolkit`

## Git Commit Style

Use conventional commit format with lowercase type prefixes:

- `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`, `build`, `revert`, `add`, `update`, `remove`
- Keep messages under 75 characters
- Single-line messages only
