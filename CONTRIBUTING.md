# Contributing to WP Ability Toolkit

Thank you for your interest in contributing to WP Ability Toolkit! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help maintain a welcoming environment for all contributors

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- PHP 7.4+ with Composer
- Docker (for wp-env)
- Git

### Development Setup

1. **Clone the repository:**

    ```bash
    git clone https://github.com/emdashcodes/wp-ability-toolkit.git
    cd wp-ability-toolkit
    ```

2. **Install dependencies:**

    ```bash
    pnpm install
    cd packages/wp-ability-toolkit
    composer install
    cd ../..
    ```

3. **Start the development environment:**

    ```bash
    pnpm env:start
    pnpm start
    ```

4. **Access WordPress:**
    - URL: http://localhost:8888/wp-admin
    - Username: `admin`
    - Password: `password`

## Development Workflow

### Making Changes

1. **Create a feature branch:**

    ```bash
    git checkout -b feat/your-feature-name
    ```

2. **Make your changes:**
    - Follow the coding standards (see below)
    - Add tests if applicable
    - Update documentation as needed

3. **Test your changes:**

    ```bash
    pnpm build
    pnpm lint
    pnpm type-check
    ```

4. **Commit your changes:**

    ```bash
    git add .
    git commit -m "feat: add your feature description"
    ```

### Commit Message Format

Use conventional commit format with lowercase type prefixes:

```
<type>: <description>

Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert, add, update, remove
```

**Examples:**

- `feat: add gemini provider support`
- `fix: resolve API key encryption issue`
- `docs: update README with new examples`
- `refactor: simplify tool execution logic`

**Rules:**

- Keep messages under 75 characters
- Use imperative mood ("add" not "added")
- Single-line messages only

### Pull Request Process

1. **Update documentation:**
    - Update README.md if adding features
    - Add entry to CHANGELOG.md
    - Update CLAUDE.md if changing development patterns

2. **Ensure quality:**
    - All tests pass
    - No linting errors
    - TypeScript compiles without errors
    - Build succeeds

3. **Create pull request:**
    - Provide clear description of changes
    - Reference related issues
    - Include screenshots for UI changes

4. **Code review:**
    - Address review feedback promptly
    - Keep discussion focused and professional
    - Update PR based on suggestions

## Coding Standards

### PHP

- Follow [WordPress Coding Standards](https://developer.wordpress.org/coding-standards/wordpress-coding-standards/php/)
- Use PHP 7.4+ type hints
- Document all public methods with PHPDoc
- Use namespaces: `WP_Ability_Toolkit\`
- File naming: `class-[name].php` (lowercase with hyphens)

### TypeScript/JavaScript

- Follow project ESLint configuration
- Use TypeScript strict mode
- Document complex functions with JSDoc
- Prefer functional components for React
- Use meaningful variable names

### CSS

- Follow WordPress admin color schemes
- Use CSS modules or scoped styles
- Ensure responsive design
- Test in WordPress admin context

## Testing

### Manual Testing

1. Test in WordPress admin environment
2. Verify chat widget functionality
3. Test with different AI providers (if applicable)
4. Check settings page works correctly
5. Verify abilities execute properly

### Automated Testing

```bash
# PHP tests
cd packages/wp-ability-toolkit
vendor/bin/phpunit

# Type checking
pnpm type-check

# Linting
pnpm lint
```

## Project Structure

```
wp-ability-toolkit/
├── packages/
│   ├── agenttic-ai-sdk-bridge/  # TypeScript bridge library
│   └── wp-ability-toolkit/       # WordPress plugin
├── claude-code-plugins/          # Claude Code marketplace skills
└── .wp-env.json                  # WordPress environment config
```

## Need Help?

- Check existing issues on GitHub
- Review CLAUDE.md for development guidance
- Ask questions in pull request discussions

## License

By contributing, you agree that your contributions will be licensed under GPL-2.0-or-later.
