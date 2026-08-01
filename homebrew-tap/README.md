# Homebrew Tap for Linkit

This repository distributes the macOS universal build of [Linkit](https://github.com/blue-idea/collection).

## Install

```bash
brew install blue-idea/tap/linkit
```

## Upgrade

```bash
brew upgrade linkit
```

## Uninstall

```bash
brew uninstall --cask linkit
```

Linkit is currently distributed without Apple notarization. This third-party Cask removes the `com.apple.quarantine` attribute from the installed `Linkit.app` after installation, without `sudo` and without modifying other applications.
