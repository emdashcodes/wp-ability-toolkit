# WordPress Ability API Scripts

This directory contains automation scripts for scaffolding and validating WordPress Abilities and Categories.

## Scripts

### Ability Scripts

- **scaffold-ability.php** - Generate ability code from CLI arguments
- **validate-ability.php** - Validate PHP ability registration code

### Category Scripts

- **scaffold-category.php** - Generate category registration code (PHP or JS)
- **validate-category.php** - Validate PHP category registration code
- **validate-category.js** - Validate JavaScript category registration code

## Requirements

### PHP Scripts

- PHP 7.0+ (uses `token_get_all()` for parsing)
- No external dependencies

### JavaScript Validator

- Node.js
- acorn parser

To install acorn:

```bash
npm install acorn
```

Or install globally:

```bash
npm install -g acorn
```

## Usage

See individual script headers for detailed usage instructions.

Quick examples:

```bash
# Scaffold a server-side ability
php scaffold-ability.php --name="plugin/ability" --type="server" --category="data-retrieval"

# Scaffold a category
php scaffold-category.php --name="custom-category" --label="Custom" --description="Description" --type="server"

# Validate PHP category
php validate-category.php path/to/category.php

# Validate JavaScript category
node validate-category.js path/to/category.js
```
