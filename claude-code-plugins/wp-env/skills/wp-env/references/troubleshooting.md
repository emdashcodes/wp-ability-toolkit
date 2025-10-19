# wp-env Troubleshooting Guide

Comprehensive troubleshooting for wp-env issues beyond the common errors covered in SKILL.md.

## Troubleshooting Common Problems

Many common problems can be fixed by running through the following troubleshooting steps in order:

### 1. Check that wp-env is running

First, check that `wp-env` is running. One way to do this is to have Docker print a table with the currently running containers:

```
docker ps
```

In this table, by default, you should see three entries: `wordpress` with port 8888, `tests-wordpress` with port 8889 and `mariadb` with port 3306.

### 2. Check the port number

By default `wp-env` uses port 8888, meaning that the local environment will be available at <http://localhost:8888>.

You can configure the port that `wp-env` uses so that it doesn't clash with another server by specifying the `WP_ENV_PORT` environment variable when starting `wp-env`:

```
WP_ENV_PORT=3333 wp-env start
```

Running `docker ps` and inspecting the `PORTS` column allows you to determine which port `wp-env` is currently using.

You may also specify the port numbers in your `.wp-env.json` file, but the environment variables will take precedence.

### 3. Restart wp-env with updates

Restarting `wp-env` will restart the underlying Docker containers which can fix many issues.

To restart `wp-env`, just run `wp-env start` again. It will automatically stop and start the container. If you also pass the `--update` argument, it will download updates and configure WordPress again.

```
wp-env start --update
```

### 4. Restart Docker

Restarting Docker will restart the underlying Docker containers and volumes which can fix many issues.

To restart Docker:

1. Click on the Docker icon in the system tray or menu bar.
2. Select `Restart`.

Once restarted, start `wp-env` again:

```
wp-env start
```

### 5. Reset the database

Resetting the database which the local environment uses can fix many issues, especially when they are related to the WordPress installation.

To reset the database:

⚠️ WARNING: This will permanently delete any posts, pages, media, etc. in the local WordPress installation.

```
wp-env clean all
wp-env start
```

### 6. Destroy everything and start again 🔥

When all else fails, you can use `wp-env destroy` to forcibly remove all of the underlying Docker containers, volumes, and files. This will allow you to start from scratch.

To do so:

⚠️ WARNING: This will permanently delete any posts, pages, media, etc. in the local WordPress installation.

```
$ wp-env destroy
# This new instance is a fresh start with no existing data:
$ wp-env start
```
