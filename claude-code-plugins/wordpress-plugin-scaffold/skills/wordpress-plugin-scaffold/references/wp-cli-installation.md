# WP-CLI Installation Guide

This reference provides comprehensive installation instructions for WP-CLI across different platforms and methods.

## Quick Check

Verify if WP-CLI is already installed:

```bash
wp --version
```

If installed, you'll see the version number. If not, follow the installation method below that best suits your environment.

## Recommended Installation (Phar Method)

The recommended way to install WP-CLI is by downloading the Phar build, marking it executable, and placing it on your PATH.

### Step 1: Download WP-CLI

```bash
curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar
```

### Step 2: Verify It Works

```bash
php wp-cli.phar --info
```

### Step 3: Make It Executable and Move to PATH

```bash
chmod +x wp-cli.phar
sudo mv wp-cli.phar /usr/local/bin/wp
```

### Step 4: Test the Installation

```bash
wp --info
```

You should see output showing OS, PHP version, WP-CLI version, etc.

## Updating WP-CLI

If you installed using the Phar method:

```bash
wp cli update
```

Or with sudo if WP-CLI is owned by root:

```bash
sudo wp cli update
```

For nightly builds (bleeding edge):

```bash
wp cli update --nightly
```

## Platform-Specific Installation

### macOS (Homebrew)

```bash
brew install wp-cli
```

### Windows

1. Ensure PHP is installed and in your PATH
2. Download [wp-cli.phar](https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar) to `c:\wp-cli`
3. Create `wp.bat` in `c:\wp-cli`:

   ```batch
   @ECHO OFF
   php "c:/wp-cli/wp-cli.phar" %*
   ```

4. Add `c:\wp-cli` to your PATH:

   ```batch
   setx path "%path%;c:\wp-cli"
   ```

### Debian/Ubuntu (.deb package)

Download and install from:
[https://github.com/wp-cli/builds/tree/gh-pages/deb](https://github.com/wp-cli/builds/tree/gh-pages/deb)

### Fedora 30+

```bash
su -c 'dnf install wp-cli'
```

### CentOS

```bash
su -c 'yum install wp-cli'
```

## Alternative Installation Methods

### Via Composer (Global)

If you have Composer and `~/.composer/vendor/bin` in your PATH:

```bash
composer global require wp-cli/wp-cli-bundle
```

Update all global packages:

```bash
composer global update
```

### Via Composer (Project)

Add to your project's `composer.json`:

```json
"require": {
    "wp-cli/wp-cli-bundle": "*"
}
```

### Via Docker

Use the official WordPress CLI image:

```yaml
image: wordpress:cli
```

See [WordPress Docker images](https://hub.docker.com/_/wordpress/) for more details.

### Specific Version

Install a specific version via Composer:

```bash
composer create-project wp-cli/wp-cli-bundle:2.1.0 --no-dev
```

### Bleeding Edge (dev-main)

```bash
composer create-project wp-cli/wp-cli-bundle:dev-main --no-dev
```

## Shell Completion

### Bash & Zsh

Download the completion script:

```bash
curl -O https://github.com/wp-cli/wp-cli/raw/main/utils/wp-completion.bash
```

Add to `~/.bash_profile` or `~/.zshrc`:

```bash
source /FULL/PATH/TO/wp-completion.bash
```

Reload your profile:

```bash
source ~/.bash_profile  # or source ~/.zshrc
```

### Oh My Zsh

Enable the built-in `wp-cli` plugin in `~/.zshrc`:

```bash
plugins=(wp-cli git [...])
```

Then reload:

```bash
source ~/.zshrc
```

### Fish

Download and install completion:

```bash
curl -O https://github.com/wp-cli/wp-cli/raw/main/utils/wp.fish
mv wp.fish ~/.config/fish/completions/wp.fish
```

## Custom PHP Binary (MAMP, etc.)

If you need to use a custom PHP binary (e.g., MAMP):

### Latest MAMP PHP Version

Add to `~/.bash_profile` or `~/.zshrc`:

```bash
PHP_VERSION=$(ls /Applications/MAMP/bin/php/ | sort -n | tail -1)
export PATH=/Applications/MAMP/bin/php/${PHP_VERSION}/bin:$PATH
```

### Specific MAMP PHP Version

Add to `~/.bash_profile` or `~/.zshrc`:

```bash
export PATH=/Applications/MAMP/bin/php/php5.5.26/bin:$PATH
```

Reload profile:

```bash
source ~/.bash_profile  # or source ~/.zshrc
```

Verify:

```bash
wp --info
```

### Using WP_CLI_PHP Environment Variable

For Composer and Git-based installations:

```bash
export WP_CLI_PHP=/path/to/custom/php
```

## Troubleshooting

### Command Not Found

If `wp` command is not found after installation:

1. Check that `/usr/local/bin` is in your PATH:

   ```bash
   echo $PATH
   ```

2. Verify the file exists and is executable:

   ```bash
   ls -la /usr/local/bin/wp
   ```

3. Try using the full path:

   ```bash
   /usr/local/bin/wp --info
   ```

### Permission Denied

If you get permission errors:

```bash
sudo chmod +x /usr/local/bin/wp
```

### PHP Version Issues

WP-CLI requires PHP 7.4 or later. Check your PHP version:

```bash
php --version
```

If your PHP version is too old, you'll need to upgrade PHP or use a custom PHP binary (see above).

## Additional Resources

- [Official WP-CLI Installation Guide](https://make.wordpress.org/cli/handbook/guides/installing/)
- [Official WP-CLI Documentation](https://make.wordpress.org/cli/handbook/)
- [WP-CLI Commands Reference](https://developer.wordpress.org/cli/commands/)
- [WP-CLI GitHub Repository](https://github.com/wp-cli/wp-cli)
- [Quick Start Guide](https://make.wordpress.org/cli/handbook/quick-start/)
