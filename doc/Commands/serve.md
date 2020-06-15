# serve Command

The `serve` command is used to serve the app in the background. It uses `pm2` to automatically restart the server in case of crashes and to watch the core's directory and config for changes to automatically reload the data.

# Installation

You must have `pm2` installed globally to use this command. To install, run `sudo npm i -g pm2`.

# Starting and Stopping

To begin serving the core on localhost, run `smol <coreName> serve start`. This will use the port configured in the core's config.

The number of server instances are also defined in the core's config, with -1 indicating 1 per logical cpu core. For development purposes, it is useful to set this to a single core to more easily see console output.

To stop a running server's instances, run `smol <coreName> serve stop`. To see whether the server is running, run `smol <coreName> serve status`. You can also restart the server by running `smol <coreName> serve restart`.

All changes are persisted to pm2's startup script, so starting the server will also ensure that it starts along with the host server, and stopping it will remove it from startup.

# Production Hosting

The server will run on the configured port. To avoid having to run the node process as root, you should set up an Apache or nginx reverse proxy to route port 80 to the server's configured port.
