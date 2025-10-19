# wp-env Configuration Guide

Complete guide to configuring wp-env using `.wp-env.json` and `.wp-env.override.json` files.

## Configuration File Overview

wp-env supports two configuration files:

1. **`.wp-env.json`** - Primary configuration, typically version controlled
2. **`.wp-env.override.json`** - Local overrides, typically gitignored

Place these files in your project root (where you run `wp-env start`).

## Basic Configuration Structure

```json
{
  "core": null,
  "phpVersion": null,
  "plugins": [],
  "themes": [],
  "port": 8888,
  "testsPort": 8889,
  "config": {},
  "mappings": {},
  "mysqlPort": null,
  "phpmyadminPort": null,
  "multisite": false,
  "lifecycleScripts": {},
  "env": {
    "development": {},
    "tests": {}
  }
}
```

## Configuration Fields

### Core WordPress Installation

**Field:** `core`
**Type:** `string | null`
**Default:** `null` (latest production WordPress)

Specifies which WordPress installation to use.

```json
{
  "core": null
}
```

**Options:**

| Value Type | Format | Example |
|------------|--------|---------|
| Latest WordPress | `null` | `"core": null` |
| Specific version | `"WordPress/WordPress#<version>"` | `"core": "WordPress/WordPress#6.4.0"` |
| Development trunk | `"WordPress/WordPress#master"` | `"core": "WordPress/WordPress#master"` |
| Local path (relative) | `".<path>"` or `"~<path>"` | `"core": "../wordpress-develop/build"` |
| Local path (absolute) | `"/<path>"` or `"<letter>:\<path>"` | `"core": "/Users/you/wordpress"` |
| Git repository | `"<owner>/<repo>#<ref>"` | `"core": "WordPress/WordPress#trunk"` |
| SSH repository | `"ssh://user@host/<path>.git#<ref>"` | `"core": "ssh://git@github.com/WordPress/WordPress.git"` |
| ZIP file | `"http[s]://<url>.zip"` | `"core": "https://wordpress.org/wordpress-6.4.zip"` |

**Environment Variable Override:** `WP_ENV_CORE`

```bash
WP_ENV_CORE="WordPress/WordPress#trunk" wp-env start
```

### PHP Version

**Field:** `phpVersion`
**Type:** `string | null`
**Default:** `null` (default WordPress production PHP version)

Specifies the PHP version to use.

```json
{
  "phpVersion": "8.1"
}
```

**Supported versions:** Any version supported by WordPress (e.g., "7.4", "8.0", "8.1", "8.2")

**Environment Variable Override:** `WP_ENV_PHP_VERSION`

```bash
WP_ENV_PHP_VERSION="8.1" wp-env start
```

### Plugins

**Field:** `plugins`
**Type:** `string[]`
**Default:** `[]`

List of plugins to install and activate.

```json
{
  "plugins": [
    ".",
    "WordPress/classic-editor",
    "../my-local-plugin",
    "https://downloads.wordpress.org/plugin/akismet.zip"
  ]
}
```

**Source Types:** Same as `core` field (paths, GitHub repos, ZIP files, etc.)

**Behavior:**

- All plugins are automatically activated
- Current directory (`.`) is auto-detected as a plugin if it contains a plugin header
- Use `mappings` instead if you don't want auto-activation

### Themes

**Field:** `themes`
**Type:** `string[]`
**Default:** `[]`

List of themes to install.

```json
{
  "themes": [
    ".",
    "WordPress/theme-experiments"
  ]
}
```

**Source Types:** Same as `core` field

**Behavior:**

- Themes are installed but not activated
- Activate via WP-CLI: `wp-env run cli wp theme activate your-theme`

### Ports

**Field:** `port`
**Type:** `integer`
**Default:** `8888`

Primary port for the development environment.

```json
{
  "port": 4000
}
```

**Access:** <http://localhost:4000>

**Environment Variable Override:** `WP_ENV_PORT` (takes precedence)

```bash
WP_ENV_PORT=4000 wp-env start
```

---

**Field:** `testsPort`
**Type:** `integer`
**Default:** `8889`

Port for the testing environment.

```json
{
  "testsPort": 4001
}
```

**Environment Variable Override:** `WP_ENV_TESTS_PORT`

### MySQL Port

**Field:** `mysqlPort`
**Type:** `integer | null`
**Default:** `null` (not exposed to host)

Expose MySQL port to the host machine.

```json
{
  "env": {
    "development": {
      "mysqlPort": 13306
    },
    "tests": {
      "mysqlPort": 13307
    }
  }
}
```

**Note:** Only available in `env.development` and `env.tests` objects, not at root level.

**Environment Variable Override:**

- `WP_ENV_MYSQL_PORT` (development)
- `WP_ENV_TESTS_MYSQL_PORT` (tests)

**Connection:**

```bash
mysql -h 127.0.0.1 -P 13306 -u root -ppassword wordpress
```

### phpMyAdmin Port

**Field:** `phpmyadminPort`
**Type:** `integer | null`
**Default:** `null` (disabled)

Enable phpMyAdmin web interface.

```json
{
  "phpmyadminPort": 9001
}
```

**Access:** <http://localhost:9001>
**Login:** username: `root`, password: `password`

**Environment Variable Override:**

- `WP_ENV_PHPMYADMIN_PORT` (development)
- `WP_ENV_TESTS_PHPMYADMIN_PORT` (tests)

### WP-Config Constants

**Field:** `config`
**Type:** `Object`
**Default:** See Default Constants section

Define wp-config.php constants.

```json
{
  "config": {
    "WP_DEBUG_LOG": true,
    "WP_DEBUG_DISPLAY": false,
    "CUSTOM_CONSTANT": "custom-value"
  }
}
```

**Special Values:**

- Set to `null` to prevent a constant from being defined
- Boolean, string, and numeric values supported

**Merging Behavior:**

- `config` values are merged between root and `env.*` objects
- Environment-specific values override root values

### Default Constants

**Development Environment:**

```json
{
  "WP_DEBUG": true,
  "SCRIPT_DEBUG": true,
  "WP_PHP_BINARY": "php",
  "WP_TESTS_EMAIL": "admin@example.org",
  "WP_TESTS_TITLE": "Test Blog",
  "WP_TESTS_DOMAIN": "localhost",
  "WP_SITEURL": "http://localhost:8888",
  "WP_HOME": "http://localhost:8888"
}
```

**Test Environment:**
Same as development, but `WP_DEBUG` and `SCRIPT_DEBUG` are `false`.

**URLs include configured ports:**
If `port: 4000`, then `WP_HOME` becomes `http://localhost:4000`.

### Directory Mappings

**Field:** `mappings`
**Type:** `Object`
**Default:** `{}`

Map local directories to WordPress directories.

```json
{
  "mappings": {
    "wp-content/mu-plugins": "./mu-plugins",
    "wp-content/themes/my-theme": "./themes/my-theme",
    "wp-content/plugins/test-plugin": "../test-plugin",
    ".htaccess": "./.htaccess"
  }
}
```

**Use Cases:**

- Add mu-plugins (must-use plugins)
- Mount multiple themes without activating them
- Add plugins without auto-activation
- Map custom directories
- Configure PHP settings via .htaccess

**Merging Behavior:**

- `mappings` values are merged between root and `env.*` objects
- Use for environment-specific mounts

### Multisite

**Field:** `multisite`
**Type:** `boolean`
**Default:** `false`

Enable WordPress multisite installation.

```json
{
  "multisite": true
}
```

**Environment Variable Override:** `WP_ENV_MULTISITE`

```bash
WP_ENV_MULTISITE=true wp-env start
```

### Lifecycle Scripts

**Field:** `lifecycleScripts`
**Type:** `Object`
**Default:** `{}`

Execute commands at specific lifecycle events.

```json
{
  "lifecycleScripts": {
    "afterStart": "node scripts/bootstrap-data.js",
    "afterClean": "echo 'Database cleaned'",
    "afterDestroy": "rm -rf .cache"
  }
}
```

**Available Events:**

- `afterStart` - After `wp-env start` completes
- `afterClean` - After `wp-env clean` completes
- `afterDestroy` - After `wp-env destroy` completes

**Environment Variable Override:**

```bash
WP_ENV_LIFECYCLE_SCRIPT_AFTER_START="npm run setup" wp-env start
```

Format: `WP_ENV_LIFECYCLE_SCRIPT_{EVENT}` (uppercase, snake_case)

**Disable Scripts:**

```bash
wp-env start --scripts=false
```

### Environment-Specific Configuration

**Field:** `env`
**Type:** `Object`
**Default:** `{}`

Override configuration for specific environments.

```json
{
  "plugins": ["."],
  "config": {
    "WP_DEBUG": true
  },
  "env": {
    "development": {
      "themes": ["./my-theme"],
      "port": 4000
    },
    "tests": {
      "plugins": [".", "woocommerce"],
      "config": {
        "WP_DEBUG": false
      },
      "port": 4001,
      "mysqlPort": 13306
    }
  }
}
```

**Merging Rules:**

- **Merged:** `config`, `mappings`
- **Replaced:** `plugins`, `themes`, `port`, `testsPort`, `core`, `phpVersion`, `multisite`

**Available Environments:**

- `development` - Main development environment (port 8888 by default)
- `tests` - Testing environment (port 8889 by default)

## Examples

### Latest stable WordPress + current directory as a plugin

This is useful for plugin development.

```json
{
  "core": null,
  "plugins": [ "." ]
}
```

### Latest development WordPress + current directory as a plugin

This is useful for plugin development when upstream Core changes need to be tested. This can also be set via the environment variable `WP_ENV_CORE`.

```json
{
  "core": "WordPress/WordPress#master",
  "plugins": [ "." ]
}
```

### Local wordpress-develop + current directory as a plugin

This is useful for working on plugins and WordPress Core at the same time.

If you are running a `build` of `wordpress-develop`, point `core` to the `build` directory.

```json
{
  "core": "../wordpress-develop/build",
  "plugins": [ "." ]
}
```

If you are running `wordpress-develop` in a dev mode (e.g. the `dev` watch command or the `build:dev` dev build), then point `core` to the `src` directory.

```json
{
  "core": "../wordpress-develop/src",
  "plugins": [ "." ]
}
```

### A complete testing environment

This is useful for integration testing: that is, testing how old versions of WordPress and different combinations of plugins and themes impact each other.

```json
{
  "core": "WordPress/WordPress#5.2.0",
  "plugins": [ "WordPress/wp-lazy-loading", "WordPress/classic-editor" ],
  "themes": [ "WordPress/theme-experiments" ]
}
```

### Add mu-plugins and other mapped directories

You can add mu-plugins via the mapping config. The mapping config also allows you to mount a directory to any location in the wordpress install, so you could even mount a subdirectory. Note here that theme-1, will not be activated.

```json
{
  "plugins": [ "." ],
  "mappings": {
    "wp-content/mu-plugins": "./path/to/local/mu-plugins",
    "wp-content/themes": "./path/to/local/themes",
    "wp-content/themes/specific-theme": "./path/to/local/theme-1"
  }
}
```

### Avoid activating plugins or themes on the instance

Since all plugins in the `plugins` key are activated by default, you should use the `mappings` key to avoid this behavior. This might be helpful if you have a test plugin that should not be activated all the time.

```json
{
  "plugins": [ "." ],
  "mappings": {
    "wp-content/plugins/my-test-plugin": "./path/to/test/plugin"
  }
}
```

### Map a plugin only in the tests environment

If you need a plugin active in one environment but not the other, you can use `env.<envName>` to set options specific to one environment. Here, we activate cwd and a test plugin on the tests instance. This plugin is not activated on any other instances.

```json
{
  "plugins": [ "." ],
  "env": {
    "tests": {
      "plugins": [ ".", "path/to/test/plugin" ]
    }
  }
}
```

### Custom Port Numbers

You can tell `wp-env` to use a custom port number so that your instance does not conflict with other `wp-env` instances.

```json
{
  "plugins": [ "." ],
  "port": 4013,
  "env": {
    "tests": {
      "port": 4012
    }
  }
}
```

These can also be set via environment variables:

- `WP_ENV_PORT` to override the development environment's web server's port.
- `WP_ENV_TESTS_PORT` to override the testing environment's web server's port.
- phpMyAdmin is not enabled by default, but its port can also be overridden for the development and testing environments via `WP_ENV_PHPMYADMIN_PORT` and `WP_ENV_TESTS_PHPMYADMIN_PORT`, respectively.
- By default, MySQL aren't exposed to the host, which means no chance of port conflicts. But these can also be overridden for the development and testing environments via `WP_ENV_MYSQL_PORT` and `WP_ENV_TESTS_MYSQL_PORT`, respectively.

### Specific PHP Version

You can tell `wp-env` to use a specific PHP version for compatibility and testing. This can also be set via the environment variable `WP_ENV_PHP_VERSION`.

```json
{
  "phpVersion": "7.2",
  "plugins": [ "." ]
}
```

### Multisite support

You can tell `wp-env` if the site should be multisite enabled. This can also be set via the environment variable `WP_ENV_MULTISITE`.

```json
{
  "multisite": true,
  "plugins": [ "." ]
}
```

### Node Lifecycle Script

This is useful for performing some actions after setting up the environment, such as bootstrapping an E2E test environment.

```json
{
  "lifecycleScripts": {
    "afterStart": "node tests/e2e/bin/setup-env.js"
  }
}
```

### Advanced PHP settings

You can set PHP settings by mapping an `.htaccess` file. This maps an `.htaccess` file to the WordPress root (`/var/www/html`) from the directory in which you run `wp-env`.

```json
{
  "mappings": {
    ".htaccess": ".htaccess"
  }
}
```

Then, your .htaccess file can contain various settings like this:

```
# Note: the default upload value is 1G.
php_value post_max_size 2G
php_value upload_max_filesize 2G
php_value memory_limit 2G
```

This is useful if there are options you'd like to add to `php.ini`, which is difficult to access in this environment.

### Using SPX Profiling

SPX is a simple profiling extension for PHP that provides low-overhead profiling with a built-in web UI. When enabled with `--spx`, you can access the SPX profiling interface to analyze your application's performance.

To enable SPX profiling:

```
wp-env start --spx
```

Once enabled, you can access the SPX web UI by visiting any page in your WordPress environment with the query parameters `?SPX_KEY=dev&SPX_UI_URI=/`. For example:

- Development site: `http://localhost:8888/?SPX_KEY=dev&SPX_UI_URI=/`
- Test site: `http://localhost:8889/?SPX_KEY=dev&SPX_UI_URI=/`

From the SPX interface, you can: – Enable profiling for subsequent requests – View flame graphs and performance metrics – Analyze function call timelines – Examine memory usage and other performance data

SPX provides a more lightweight alternative to Xdebug for profiling, with minimal performance overhead and an intuitive web-based interface.

## Configuration Override System

### .wp-env.override.json

Create `.wp-env.override.json` for local-only configuration:

```json
{
  "port": 3000,
  "config": {
    "LOCAL_SETTING": "local-value"
  }
}
```

**Merging Behavior:**

- Override file values take precedence over `.wp-env.json`
- `config` and `mappings` are merged
- Other fields are replaced

**Example:**

`.wp-env.json`:

```json
{
  "plugins": [".", "woocommerce"],
  "config": {
    "WP_DEBUG": true,
    "KEY_1": "value-1"
  }
}
```

`.wp-env.override.json`:

```json
{
  "plugins": ["."],
  "config": {
    "KEY_1": "override-1",
    "KEY_2": "value-2"
  }
}
```

**Result:**

```json
{
  "plugins": ["."],
  "config": {
    "WP_DEBUG": true,
    "KEY_1": "override-1",
    "KEY_2": "value-2"
  }
}
```

**Best Practice:** Add to `.gitignore`:

```gitignore
.wp-env.override.json
```

## Environment Variables

Configuration fields can be overridden via environment variables. See [command-reference.md](command-reference.md) for the complete list of environment variables and their usage.

**Precedence:** Environment variables > `.wp-env.override.json` > `.wp-env.json`

## Source Type Reference

All configuration fields that accept sources (`core`, `plugins`, `themes`) support these formats:

| Type | Format | Example |
|------|--------|---------|
| Relative path | `.<path>` or `~<path>` | `"."`, `"../plugin"`, `"~/projects/theme"` |
| Absolute path | `/<path>` or `<letter>:\<path>` | `"/var/www/plugin"`, `"C:\\projects\\theme"` |
| GitHub repo | `<owner>/<repo>[/<path>][#<ref>]` | `"WordPress/gutenberg"`, `"WordPress/gutenberg#trunk"` |
| SSH repo | `ssh://user@host/<path>.git[#<ref>]` | `"ssh://git@github.com/WordPress/WordPress.git"` |
| ZIP file | `http[s]://<url>.zip` | `"https://downloads.wordpress.org/plugin/akismet.zip"` |

**Notes:**

- GitHub repos without `#<ref>` use the default branch
- Remote sources are downloaded to `~/.wp-env/`
- Relative paths are relative to the directory containing `.wp-env.json`

## Configuration Validation

wp-env validates configuration on startup. Common errors:

### Invalid JSON

```
Error: Failed to parse .wp-env.json
```

Fix: Validate JSON syntax (use a JSON validator or linter).

### Invalid Port Number

```
Error: Port must be a number between 0 and 65535
```

Fix: Use valid port numbers (typically 1024-65535 for user applications).

### Invalid Source Path

```
Error: Could not find source at path: /invalid/path
```

Fix: Verify local paths exist and are accessible.

### Conflicting Ports

```
Error: Port 8888 is already in use
```

Fix: Change port in configuration or stop the conflicting service.

## Best Practices

### Version Control

**Do commit:**

- `.wp-env.json` - Share configuration with team

**Don't commit:**

- `.wp-env.override.json` - Local-only settings
- `~/.wp-env/` - Downloaded sources and environment files

### Team Consistency

Use `.wp-env.json` for shared configuration:

```json
{
  "core": "WordPress/WordPress#6.4.0",
  "phpVersion": "8.1",
  "plugins": ["."],
  "config": {
    "WP_DEBUG_LOG": true
  }
}
```

Use `.wp-env.override.json` for personal preferences:

```json
{
  "port": 4000,
  "phpmyadminPort": 9001
}
```

### Documentation

Document custom configuration in your project README:

```markdown
## Local Development

This project uses wp-env for local development.

### Setup
1. Install wp-env: `npm -g install @wordpress/env`
2. Start environment: `wp-env start`
3. Access site: http://localhost:8888

### Custom Configuration
- Uses WordPress 6.4.0
- PHP 8.1
- Includes WooCommerce for testing
```

### Environment-Specific Settings

Use `env` for different needs in development vs testing:

```json
{
  "plugins": ["."],
  "env": {
    "development": {
      "plugins": [".", "query-monitor"],
      "config": {
        "WP_DEBUG_DISPLAY": true
      }
    },
    "tests": {
      "plugins": ["."],
      "config": {
        "WP_DEBUG_DISPLAY": false
      }
    }
  }
}
```

### Minimal Configuration

Start minimal, add configuration as needed:

```json
{
  "plugins": ["."]
}
```

Then add features incrementally based on requirements.
