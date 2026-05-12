# Deploy Host Setup

GitHub Actions connects as `deploy` over SSH. Because Actions runs without a terminal, the `deploy` user must be allowed to restart and inspect the app service without a sudo password.

On the server, the sudoers drop-in should allow the exact command path and arguments used by the workflow:

```sh
sudo visudo -f /etc/sudoers.d/deploy-alignment
```

Required entries:

```sudoers
deploy ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart darkmaze
deploy ALL=(ALL) NOPASSWD: /usr/bin/systemctl status darkmaze
```

Quick check as `deploy`:

```sh
sudo -n /usr/bin/systemctl status darkmaze
sudo -n /usr/bin/systemctl restart darkmaze
```

If either command says a password is required, the GitHub deploy will fail for the same reason.
