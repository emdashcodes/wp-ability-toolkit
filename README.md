# WP Ability Toolkit

A toolkit for WordPress plugin development, testing AI agent integrations, and WordPress Ability API creation. This repository contains:

- **Claude Code Marketplace** - Specialized skills for WordPress development, WordPress environment management, and WordPress Ability creation
- **Toolkit for WordPress** - A workspace for building WordPress abilities and plugins

## Features

- **Agent for debugging WordPress Abilities** - Includes an agent for WordPress that allows you to test and debug WordPress Abilities and navigate around your WordPress Admin
- **OpenAI Support** - OpenAI (GPT-4, GPT-4o, GPT-4-turbo)
- **Claude Code Skills** - Specialized development skills for plugin creation, validation, and environment management

## Claude Code Marketplace

This repository includes a Claude Code marketplace with specialized skills for WordPress development:

### Installation

Install the marketplace in Claude Code:

```bash
/plugin marketplace add emdashcodes/wp-ability-toolkit
```

### Available Skills

**wordpress-ability-api** - Create and validate WordPress Abilities

- Scaffold server-side (PHP) and client-side (JavaScript) abilities
- Validate ability code with comprehensive checks
- Generate category registration code
- Full reference documentation for the WordPress Abilities API

```bash
/plugin install wordpress-ability-api@emdashcodes-wp-ability-toolkit
```

**wordpress-plugin-scaffold** - Scaffold WordPress plugins with WP-CLI

- Create new WordPress plugins with full boilerplate
- Add test infrastructure to existing plugins
- Intelligent wp-env environment detection
- Plugin activation and testing workflows

```bash
/plugin install wordpress-plugin-scaffold@emdashcodes-wp-ability-toolkit
```

**wp-env** - Manage local WordPress development environments

- Start, stop, and configure Docker-based WordPress environments
- Execute WP-CLI commands inside environments
- Manage plugins, themes, and WordPress core
- Complete `.wp-env.json` configuration guide

```bash
/plugin install wp-env@emdashcodes-wp-ability-toolkit
```

### Using the Skills

Once installed, Claude Code will automatically activate these skills when you work on WordPress Ability or WordPress projects if you allow it to. The skills are designed to work together but can also be used independently in your other projects to scaffold WordPress plugins and environments.

## Architecture

- **`packages/`** - WordPress plugin packages (pnpm monorepo)
    - `wp-ability-toolkit` - WordPress plugin with PHP backend and React frontend
    - `agenttic-ai-sdk-bridge` - TypeScript bridge connecting WordPress REST API with Agenttic UI
- **`claude-code-plugins/`** - Claude Code marketplace skills
    - `wordpress-ability-api` - Ability scaffolding and validation
    - `wordpress-plugin-scaffold` - WP-CLI plugin scaffolding

### Technology Stack

- **Backend**: WordPress PHP with basic endpoints for interacting with LLM providers
- **Frontend**: React + TypeScript using `@wordpress/element` and `@automattic/agenttic-ui`
- **Build Tools**: `@wordpress/scripts` for the plugin, TypeScript compiler for the bridge
- **Dev Environment**: `@wordpress/env` (Docker-based WordPress)

## Prerequisites

- Node.js >= 20.0.0
- pnpm >= 8.0.0
- Docker Desktop (for wp-env)

## Quick Start

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start WordPress development environment
pnpm env:start

# Access WordPress admin at http://localhost:8888/wp-admin
# Login: admin / password
```

## Configuration

1. Navigate to **Settings > AI Ability Toolkit** in WordPress admin
2. Enter your OpenAI API key (encrypted before storage)
3. Choose your model (e.g., `gpt-4o`, `gpt-4-turbo`, or `gpt-4`)
4. Save settings

## Development Workflow

### Making Changes

1. **Start development mode**:

    ```bash
    pnpm start
    ```

    This runs webpack in watch mode for hot-reloading.

2. **Edit files**:
    - Plugin source: `packages/wp-ability-toolkit/src/`
    - Bridge source: `packages/agenttic-ai-sdk-bridge/src/`
    - PHP classes: `packages/wp-ability-toolkit/includes/`

3. **Test**:
    - Chat widget appears in bottom-right of wp-admin
    - Try sending messages to test streaming responses

### Project Structure

```
wp-ability-toolkit/
├── .claude-plugin/                 # Claude Code marketplace
│   └── marketplace.json            # Marketplace configuration
├── claude-code-plugins/            # Claude Code skills
│   ├── wordpress-ability-api/
│   │   └── skills/wordpress-ability-api/
│   ├── wordpress-plugin-scaffold/
│   │   └── skills/wordpress-plugin-scaffold/
│   └── wp-env/
│       └── skills/wp-env/
├── packages/                       # WordPress packages (pnpm monorepo)
│   ├── agenttic-ai-sdk-bridge/     # TypeScript bridge package
│   │   ├── src/
│   │   │   ├── index.ts            # Main entry point
│   │   │   ├── useWordPressChat.ts # React hook
│   │   │   ├── streamAdapter.ts    # SSE parsing
│   │   │   └── types.ts            # TypeScript interfaces
│   │   └── package.json
│   └── wp-ability-toolkit/         # WordPress plugin
│       ├── src/
│       │   ├── admin/              # Settings page
│       │   └── chat-widget/        # Chat UI
│       ├── includes/
│       ├── wp-ability-toolkit.php  # Main plugin file
│       └── package.json
├── package.json                    # Root package
├── pnpm-workspace.yaml             # Workspace configuration
├── .wp-env.json                    # WordPress environment config
└── CLAUDE.md                       # Claude Code instructions
```

## Available Scripts

From the root directory:

```bash
# Build all packages
pnpm build

# Build bridge package only
pnpm build:bridge

# Build plugin package only
pnpm build:plugin

# Start development mode (watch mode)
pnpm start

# Start WordPress environment
pnpm env:start

# Stop WordPress environment
pnpm env:stop

# Clean WordPress environment
pnpm env:clean
```

## API Endpoints

### Chat Endpoint

```
POST /wp-json/wp-ability-toolkit/v1/chat
```

Handles chat messages with streaming responses via Server-Sent Events.

**Request:**

```json
{
    "messages": [
        {
            "role": "user",
            "content": "Hello, how are you?"
        }
    ]
}
```

**Response:** SSE stream

```
data: {"delta": "Hi"}
data: {"delta": " there!"}
data: {"done": true}
```

### Settings Endpoints

```
GET  /wp-json/wp-ability-toolkit/v1/settings
POST /wp-json/wp-ability-toolkit/v1/settings
```

Manage plugin settings (requires `manage_options` capability).

## WordPress Ability API Integration

The plugin loads the latest version of the WordPress Ability API and includes a hook for loading WordPress Abilities:

```php
do_action( 'wp_ability_toolkit_register_abilities' );
```

This hook is only meant for testing and debugging Abilities. If you want to ship something, make your own plugin using the include Claude Code skills.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

GPL-2.0-or-later

## Author

Em - [@emdashcodes](https://emdash.codes)
[{Github}](https://github.com/emdashcodes)
