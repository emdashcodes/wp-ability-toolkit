# wp-env Command Reference

Complete reference for all `wp-env` commands, options, and environment variables.

## Command Overview

| Command | Description |
|---------|-------------|
| `wp-env start` | Install and start the WordPress environment |
| `wp-env stop` | Stop the WordPress environment |
| `wp-env clean` | Clean the WordPress databases |
| `wp-env run` | Run arbitrary commands in containers |
| `wp-env destroy` | Destroy the WordPress environment completely |
| `wp-env logs` | Display PHP and Docker logs |
| `wp-env install-path` | Get the path where environment files are stored |

## wp-env start

Installs and initializes the WordPress environment, including downloading specified remote sources.

```
wp-env start [options]
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--debug` | boolean | `false` | Enable debug output |
| `--update` | boolean | `false` | Download source updates and apply WordPress configuration |
| `--xdebug` | string | - | Enable Xdebug (see Xdebug section below) |
| `--spx` | string | - | Enable SPX profiling (see SPX section below) |
| `--scripts` | boolean | `true` | Execute any configured lifecycle scripts |

### Behavior

- On first run: Downloads WordPress, creates containers, initializes environment
- Subsequent runs: Starts existing environment without changes
- With `--update`: Re-downloads sources and re-applies configuration (doesn't overwrite content)

### Environment Variables

These environment variables override `.wp-env.json` settings:

| Variable | Description | Example |
|----------|-------------|---------|
| `WP_ENV_PORT` | Development environment web server port | `WP_ENV_PORT=3333 wp-env start` |
| `WP_ENV_TESTS_PORT` | Testing environment web server port | `WP_ENV_TESTS_PORT=3334 wp-env start` |
| `WP_ENV_MYSQL_PORT` | MySQL port for development environment | `WP_ENV_MYSQL_PORT=13306 wp-env start` |
| `WP_ENV_TESTS_MYSQL_PORT` | MySQL port for testing environment | `WP_ENV_TESTS_MYSQL_PORT=13307 wp-env start` |
| `WP_ENV_PHPMYADMIN_PORT` | phpMyAdmin port for development | `WP_ENV_PHPMYADMIN_PORT=9001 wp-env start` |
| `WP_ENV_TESTS_PHPMYADMIN_PORT` | phpMyAdmin port for testing | `WP_ENV_TESTS_PHPMYADMIN_PORT=9002 wp-env start` |
| `WP_ENV_HOME` | Directory for wp-env files | `WP_ENV_HOME="./local" wp-env start` |
| `WP_ENV_CORE` | WordPress version/source | `WP_ENV_CORE="WordPress/WordPress#trunk" wp-env start` |
| `WP_ENV_PHP_VERSION` | PHP version to use | `WP_ENV_PHP_VERSION="8.0" wp-env start` |
| `WP_ENV_MULTISITE` | Enable multisite | `WP_ENV_MULTISITE=true wp-env start` |

Note: Environment variables take precedence over `.wp-env.json` values.

### Xdebug Support

Enable Xdebug for debugging PHP code:

```bash
# Enable with default "debug" mode
wp-env start --xdebug

# Enable with specific modes
wp-env start --xdebug=profile,trace,debug

# When using npm run (in local project dependencies)
npm run wp-env start -- --xdebug
```

**Xdebug Modes:**

- `debug` - Step debugging (default when --xdebug is used)
- `develop` - Development aids
- `coverage` - Code coverage analysis
- `gcstats` - Garbage collection statistics
- `profile` - Profiling
- `trace` - Function trace

See [Xdebug documentation](https://xdebug.org/docs/all_settings#mode) for mode details.

**Requirements:**

- PHP version >= 7.2 (Xdebug won't install on legacy PHP versions)
- IDE configuration for port 9003

**IDE Configuration Example (VS Code):**

```json
{
  "name": "Listen for XDebug",
  "type": "php",
  "request": "launch",
  "port": 9003,
  "pathMappings": {
    "/var/www/html/wp-content/plugins/your-plugin": "${workspaceFolder}/"
  }
}
```

### SPX Profiling

SPX is a lightweight profiling extension with a built-in web UI:

```bash
# Enable SPX profiling
wp-env start --spx

# With specific mode
wp-env start --spx=enabled
```

**Access SPX UI:**

- Development: <http://localhost:8888/?SPX_KEY=dev&SPX_UI_URI=/>
- Testing: <http://localhost:8889/?SPX_KEY=dev&SPX_UI_URI=/>

**SPX Features:**

- Flame graphs and performance metrics
- Function call timelines
- Memory usage analysis
- Minimal performance overhead

See [SPX documentation](https://github.com/NoiseByNorthwest/php-spx) for details.

### Examples

```bash
# Basic start
wp-env start

# Start with updates
wp-env start --update

# Start with custom port
WP_ENV_PORT=4000 wp-env start

# Start with Xdebug enabled
wp-env start --xdebug

# Start with multisite and custom PHP version
WP_ENV_MULTISITE=true WP_ENV_PHP_VERSION="8.1" wp-env start

# Start with debug output
wp-env start --debug
```

## wp-env stop

Stops running WordPress containers and frees the ports.

```
wp-env stop [options]
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--debug` | boolean | `false` | Enable debug output |

### Behavior

- Stops all containers for the current project
- Preserves all data (database, uploads, configuration)
- Frees ports (8888, 8889, etc.)
- Containers can be restarted with `wp-env start`

### Example

```bash
wp-env stop
```

## wp-env clean

Cleans (resets) WordPress databases.

```
wp-env clean [environment] [options]
```

### Arguments

| Argument | Choices | Default | Description |
|----------|---------|---------|-------------|
| `environment` | `all`, `development`, `tests` | `tests` | Which environment's database to clean |

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--debug` | boolean | `false` | Enable debug output |
| `--scripts` | boolean | `true` | Execute any configured lifecycle scripts |

### Behavior

⚠️ **Warning:** Permanently deletes all posts, pages, media, users (except admin), and other WordPress content.

- Resets database to fresh WordPress installation
- Preserves WordPress core files and configuration
- Keeps admin user (username: `admin`, password: `password`)

### Examples

```bash
# Clean tests database only (default)
wp-env clean
wp-env clean tests

# Clean development database
wp-env clean development

# Clean both databases
wp-env clean all
```

## wp-env run

Runs arbitrary commands in Docker containers.

```
wp-env run <container> <command> [options]
```

### Arguments

| Argument | Type | Description |
|----------|------|-------------|
| `container` | string (required) | The Docker service to run the command on |
| `command` | string (required) | The command to run |

### Available Containers

| Container | Description | Available Tools |
|-----------|-------------|-----------------|
| `cli` | WP-CLI environment (development) | wp-cli, composer, phpunit, bash |
| `tests-cli` | WP-CLI environment (testing) | wp-cli, composer, phpunit, bash |
| `wordpress` | WordPress PHP environment (development) | php |
| `tests-wordpress` | WordPress PHP environment (testing) | php |
| `mysql` | MySQL database (development) | mysql |
| `tests-mysql` | MySQL database (testing) | mysql |
| `composer` | Composer environment | composer |
| `phpmyadmin` | phpMyAdmin (if enabled) | - |

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--debug` | boolean | `false` | Enable debug output |
| `--env-cwd` | string | `"."` | Working directory inside container (relative to WordPress root) |

### Working Directory

- Default: WordPress root (`/var/www/html`)
- Paths without leading slash are relative to WordPress root
- Use `--env-cwd` for commands that need specific directory context

### Argument Parsing

Commands with options that conflict with wp-env options require `--` separator:

```bash
# This shows wp-env help (--help interpreted by wp-env)
wp-env run cli php --help

# This shows PHP help (--help passed to php)
wp-env run cli php -- --help
```

### Examples

#### WP-CLI Commands

```bash
# List users
wp-env run cli wp user list

# Install and activate a plugin
wp-env run cli wp plugin install contact-form-7 --activate

# Create a post on tests instance
wp-env run tests-cli wp post create --post_title="Test" --post_status=publish

# Update permalink structure
wp-env run cli "wp rewrite structure /%postname%/"

# Open WordPress shell (interactive PHP)
wp-env run cli wp shell
```

#### Composer Commands

```bash
# Run composer install in a plugin directory
wp-env run cli --env-cwd=wp-content/plugins/your-plugin composer install

# Update dependencies
wp-env run cli --env-cwd=wp-content/plugins/your-plugin composer update

# Show installed packages
wp-env run cli --env-cwd=wp-content/plugins/your-plugin composer show
```

#### PHPUnit Commands

```bash
# Run tests in a plugin
wp-env run tests-cli --env-cwd=wp-content/plugins/your-plugin phpunit

# Run specific test file
wp-env run tests-cli --env-cwd=wp-content/plugins/your-plugin phpunit tests/test-sample.php

# Run with coverage
wp-env run tests-cli --env-cwd=wp-content/plugins/your-plugin phpunit --coverage-html coverage
```

#### Shell Access

```bash
# Open bash shell in CLI container
wp-env run cli bash

# Open bash in tests container
wp-env run tests-cli bash

# Run a bash script
wp-env run cli bash /var/www/html/wp-content/plugins/your-plugin/scripts/setup.sh
```

#### Direct PHP Execution

```bash
# Run PHP script
wp-env run cli php /var/www/html/wp-content/plugins/your-plugin/scripts/migrate.php

# Execute PHP code directly
wp-env run cli php -r "echo phpversion();"
```

## wp-env destroy

Destroys the WordPress environment completely.

```
wp-env destroy [options]
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--debug` | boolean | `false` | Enable debug output |
| `--scripts` | boolean | `true` | Execute any configured lifecycle scripts |

### Behavior

⚠️ **Warning:** Permanently deletes:

- All Docker containers
- All Docker volumes (databases, uploads, etc.)
- All Docker networks
- All local files in the wp-env home directory

Use this when:

- Environment is corrupted beyond repair
- Need to start completely fresh
- Freeing up disk space
- Removing wp-env from a project

### Example

```bash
# Destroy everything
wp-env destroy

# Create fresh environment
wp-env start
```

## wp-env logs

Displays PHP and Docker logs for the WordPress environment.

```
wp-env logs [environment] [options]
```

### Arguments

| Argument | Choices | Default | Description |
|----------|---------|---------|-------------|
| `environment` | `development`, `tests`, `all` | `development` | Which environment to display logs from |

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--debug` | boolean | `false` | Enable debug output |
| `--watch` | boolean | `true` | Watch for logs as they happen (follow mode) |

### Behavior

- Shows PHP error logs and Docker container logs
- By default, follows/tails logs in real-time (press Ctrl+C to stop)
- Use `--watch=false` to show current logs and exit

### Examples

```bash
# View development logs (follows by default)
wp-env logs

# View testing environment logs
wp-env logs tests

# View both environments
wp-env logs all

# Show logs without following
wp-env logs --watch=false

# View with debug output
wp-env logs --debug
```

## wp-env install-path

Gets the path where all environment files are stored.

```
wp-env install-path
```

### Behavior

Returns the absolute path to the directory containing:

- Docker files and configurations
- Downloaded WordPress core
- PHPUnit files
- Downloaded plugins, themes, and other sources

### Path Format

- Default location: `$WP_ENV_HOME/$md5_of_project_path`
- macOS/Windows default: `~/.wp-env/$md5_of_project_path`
- Linux default: `~/wp-env/$md5_of_project_path` (for Snap compatibility)

### Example

```bash
$ wp-env install-path
/home/user/.wp-env/63263e6506becb7b8613b02d42280a49
```

## Global Options

Options available for all commands:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--debug` | boolean | `false` | Enable debug output for troubleshooting |
| `--help` | boolean | `false` | Show help for the command |
| `--version` | boolean | `false` | Show wp-env version number |

## Lifecycle Scripts

Lifecycle scripts run automatically at certain points. Configure in `.wp-env.json`:

```json
{
  "lifecycleScripts": {
    "afterStart": "node scripts/setup-e2e.js",
    "afterClean": "echo 'Database cleaned'",
    "afterDestroy": "rm -rf custom-cache"
  }
}
```

### Available Lifecycle Events

| Event | When It Runs | Use Cases |
|-------|--------------|-----------|
| `afterStart` | After `wp-env start` completes | Bootstrap data, run migrations, configure environment |
| `afterClean` | After `wp-env clean` completes | Log cleanup, reset custom data |
| `afterDestroy` | After `wp-env destroy` completes | Clean up external resources |

### Environment Variable Override

Override lifecycle scripts via environment variables:

```bash
WP_ENV_LIFECYCLE_SCRIPT_AFTER_START="npm run bootstrap" wp-env start
```

Format: `WP_ENV_LIFECYCLE_SCRIPT_{EVENT_NAME}` (uppercase, snake_case)

## Exit Codes

All wp-env commands use standard exit codes:

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Error (see error message for details) |

## Tips and Best Practices

### Using with npm Scripts

Add wp-env commands to `package.json` for convenience:

```json
{
  "scripts": {
    "wp-env": "wp-env",
    "env:start": "wp-env start",
    "env:stop": "wp-env stop",
    "env:clean": "wp-env clean all && wp-env start",
    "env:reset": "wp-env destroy && wp-env start",
    "wp": "wp-env run cli wp",
    "composer": "wp-env run cli --env-cwd=wp-content/plugins/your-plugin composer",
    "test": "wp-env run tests-cli --env-cwd=wp-content/plugins/your-plugin phpunit"
  }
}
```

Then use: `npm run env:start`, `npm run test`, etc.

### Passing Flags to npm Scripts

When using `npm run wp-env`, use `--` to pass flags:

```bash
# Wrong: --update goes to npm, not wp-env
npm run env:start --update

# Right: --update passed to wp-env
npm run env:start -- --update
```

### Command Chaining

Chain commands for complex workflows:

```bash
# Reset and start fresh
wp-env clean all && wp-env start

# Destroy, recreate, and install a plugin
wp-env destroy && wp-env start && wp-env run cli wp plugin install woocommerce --activate
```

### Checking Environment Status

Verify wp-env is running properly:

```bash
# Check running containers
docker ps

# Should show three containers by default:
# - wordpress (port 8888)
# - tests-wordpress (port 8889)
# - mariadb (port 3306)

# Check wp-env version
wp-env --version

# View install path
wp-env install-path
```

### Working with Multiple Projects

Each project has its own isolated environment:

```bash
# Project 1
cd ~/projects/plugin-a
wp-env start  # Uses port 8888

# Project 2 (different port)
cd ~/projects/plugin-b
WP_ENV_PORT=4000 wp-env start  # Uses port 4000
```

## WordPress PHPUnit Tests

wp-env includes WordPress' PHPUnit test files automatically.

### Environment Variable

- `WP_TESTS_DIR` - Points to PHPUnit test files location within containers
- Files correspond to the installed WordPress version

### Custom wp-tests-config.php

Override the default test configuration:

```php
// In your bootstrap.php file
define('WP_TESTS_CONFIG_FILE_PATH', '/path/to/custom/wp-tests-config.php');
```

WordPress will use your custom file instead of the default.

### Running Tests

```bash
# Run all tests
wp-env run tests-cli --env-cwd=wp-content/plugins/your-plugin phpunit

# Run specific test file
wp-env run tests-cli --env-cwd=wp-content/plugins/your-plugin phpunit tests/test-sample.php

# Run with bootstrap file
wp-env run tests-cli --env-cwd=wp-content/plugins/your-plugin phpunit --bootstrap=tests/bootstrap.php
```

## Database Access

Direct database access credentials:

| Environment | Host | Port | User | Password | Database |
|-------------|------|------|------|----------|----------|
| Development | `localhost` | `WP_ENV_MYSQL_PORT` (random if not set) | `root` | `password` | `wordpress` |
| Testing | `localhost` | `WP_ENV_TESTS_MYSQL_PORT` (random if not set) | `root` | `password` | `wordpress-tests` |

**Note:** MySQL ports are not exposed by default. Set `WP_ENV_MYSQL_PORT` or `WP_ENV_TESTS_MYSQL_PORT` to expose them.

### Connecting with MySQL Client

```bash
# Expose MySQL port first
WP_ENV_MYSQL_PORT=13306 wp-env start

# Connect from host
mysql -h 127.0.0.1 -P 13306 -u root -ppassword wordpress
```

### Using phpMyAdmin

```bash
# Enable phpMyAdmin on port 9001
WP_ENV_PHPMYADMIN_PORT=9001 wp-env start

# Access at http://localhost:9001
# Login: root / password
```

Or configure in `.wp-env.json`:

```json
{
  "phpmyadminPort": 9001
}
```
