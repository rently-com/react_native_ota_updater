# React Native OTA Updater

<div align="center">

![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)
![pnpm](https://img.shields.io/badge/pnpm-%5E10-orange.svg)
![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)

**CodePush OTA update solution for React Native applications**

</div>

## Overview

React Native OTA Updater is a complete solution for managing over-the-air updates for React Native applications using [react-native-code-push](https://github.com/microsoft/react-native-code-push). It provides a powerful CLI tool, web dashboard, and API server that enables mobile teams to push updates to their React Native applications without going through the app store review process.

This uses Cloudflare R2 bucket for storing bundles. You can choose your own S3 compatible storage. Make sure to update ENV variables accordingly.

You can use [this](https://aexomir1.medium.com/configuring-react-native-code-push-using-custom-server-e40e87697a26) article to set your Custom Host URL in react-native-code-push.

### Key Features

🧑🏻‍💻 **CodePush Compatible** - Drop-in replacement for Microsoft CodePush  
🔧 **Self-Hostable** - Deploy on your own infrastructure  
🚀 **Seamless Updates** - Push JavaScript bundle updates instantly to your React Native apps  
🛠️ **CLI Tool** - Powerful command-line interface for developers  
📊 **Web Dashboard** - Beautiful web interface for managing apps and deployments  
🔐 **Authentication** - Secure access with GitHub OAuth and access keys  
📱 **Multi-Platform** - Support for both iOS and Android platforms  
🔄 **Deployment Management** - Create and manage multiple deployment environments  
📈 **Analytics** - Track update metrics and user adoption  
📦 **MonoRepo** - Modular architecture with shared utilities and API client

### Demo

![Showcase](/docs/showcase.gif)

### Why Create This?

When Microsoft open-sourced their CodePush Server, it remained deeply coupled with Azure, limiting flexibility for developers who preferred alternative infrastructures. While many leveraged its permissive MIT license to build closed-source SaaS products, we envisioned something different.

This project is a modern, community-first reimagination of the original CodePush server — built with the following goals:

🧱 **Modular Architecture** – Clean separation of concerns with shared utilities and a robust API client  
🛠️ **Bring Your Own Infrastructure (BYOI)** – Fully self-hostable, cloud-agnostic setup  
🖥️ **Intuitive Dashboard** – Full control over apps, deployments, and collaborators  
🧑‍💻 **TypeScript First** – Entire codebase written in modern, type-safe TypeScript  
🔓 **Truly Open Source** – Licensed under GPL to ensure improvements stay in the open and benefit the community

We set out to build a fullstack, production-grade OTA update platform for React Native apps — one that respects developer freedom, encourages extensibility, and doesn’t put features behind a paywall.

## Architecture

This project is built as a monorepo using **Turborepo** and **pnpm** with the following components:

- **CLI Tool** (`@rentlydev/rnota-cli`) - Command-line interface for developers
- **Web Dashboard** (`@rentlydev/rnota-web`) - Next.js web application
- **API Server** (`@rentlydev/rnota-api`) - Hono.js REST API hosted behind Next.js API Routes
- **Database** (`@rentlydev/rnota-db`) - Drizzle ORM with PostgreSQL
- **Authentication** (`@rentlydev/rnota-auth`) - Auth.js integration
- **Shared Libraries** - Common utilities and API client

## Quick Start

### Prerequisites

- **Node.js** >= 22
- **pnpm** >= 10
- **PostgreSQL** database
- **Redis** (for caching)

```bash
# Install Node.js via Homebrew
# You can use any other package manager like nvm, asdf, etc.
brew install node@22

# Install pnpm
brew install pnpm@10
```

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/rently-com/react-native-ota-updater.git
   cd react-native-ota-updater
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start Database/Redis [Docker Required]**

   ```bash
   # Read the start-services.sh script for more details or modify it as per your needs
   bash start-services.sh
   ```

5. **Set up the database**

   ```bash
   pnpm db:push
   ```

6. **Start the development servers**
   ```bash
   pnpm dev
   ```

### CLI Installation (Building from Source Local)

#### Installation

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Build the CLI tool**

   ```bash
   pnpm build:cli
   ```

3. **Link the CLI globally**

   ```bash
   pnpm link:cli
   ```

4. **Verify installation**

   ```bash
   rnota --version
   ```

#### Updating

1. **Pull the latest changes**

   ```bash
   git pull
   ```

> Repeat Installation Steps from 1 to 4.

#### Uninstallation

1. **Uninstall the CLI globally**

   ```bash
   pnpm remove:cli
   ```

### CLI Installation (NPM Package)

#### Installation

1. **Install dependencies**

   ```bash
   npm install -g @rentlydev/rnota-cli
   ```

2. **Verify installation**

   ```bash
   rnota --version
   ```

#### Updating

1. **Pull the latest changes**

   ```bash
   npm update -g @rentlydev/rnota-cli
   ```

#### Uninstallation

1. **Uninstall the CLI globally**

   ```bash
   npm uninstall -g @rentlydev/rnota-cli
   ```

## Usage

### CLI Commands

> Note: You can use the Handy Scripts in `deploy-scripts` to deploy your React Native app without typing long commands into the CLI.

Full CLI documentation is available [here](/packages/cli/README.md).

The CLI provides comprehensive commands for managing your React Native OTA updates:

#### Authentication

```bash
# Login with browser-based authentication
rnota login

# Choose the Environment [Local, Staging, Production]

# Login with access key
rnota login --accessKey YOUR_ACCESS_KEY

# Check current user
rnota whoami

# Logout
rnota logout
```

### Web Dashboard

The web dashboard provides a user-friendly interface for:

- **App Management** - Create and configure CodePush applications
- **Deployment Overview** - Monitor deployment status and metrics
- **Release History** - View and manage release history
- **Collaborator Management** - Manage team access and permissions
- **Analytics** - Track update adoption and performance metrics

Access the dashboard at `http://localhost:3000` after starting the development server.  
You can find the Open-API Documentation at `http://localhost:3000/api/reference` after starting the development server.

## Configuration

### React Native Integration

Old Architecture:

- Tested on React Native 0.72
- [CodePush SDK](https://github.com/microsoft/react-native-code-push)

New Architecture:

- Tested on React Native 0.76
- [CodePushNext SDK](https://github.com/CodePushNext/react-native-code-push)

## Development

### Modify Labels & Branding

- Replace all occurrences of `@rentlydev/rnota` with your own organization name
- Search for `branding` file under the web & cli packages to update the branding of the project.
- Update the `ADMIN_USER_EMAILS` in the [DB Tables](/internal/db/src/schema/_table.ts) to add your own admin users.

### How the Database Schema is Architected?

Check out the [ExcaliDraw File](/docs/react-native-ota-updater.excalidraw) for more details.

### Project Structure

```
react-native-ota-updater/
├── apps/
│   └── web/                 # Next.js web dashboard
├── deploy-scripts/          # Handy Scripts for Your React Native Project for Easier Deployment
│   └── rnotaConfig.cfg/     # Configuration file for deployment
│   └── rnotaDeploy.sh/      # Deployment script
├── docs/                    # Documentation
│   └── showcase.gif/        # Showcase GIF
├── internal/
│   ├── auth/                # Authentication module
│   └── aws/                 # AWS integration
│   ├── db/                  # Database schema and migrations
│   ├── redis/               # Redis integration
│   ├── scripts/             # Scripts for DB migrations
├── packages/
│   ├── api/                 # Hono.js API server
│   ├── cli/                 # OCLIF CLI tool
└── shared/
│   └── api-client/          # Shared API client
└── tooling/
│   └── typescript/          # Shared TypeScript config
```

### Available Scripts

```bash
# Development
pnpm dev                    # Start all development servers
pnpm typecheck              # Run TypeScript type checking
pnpm lint:ws                # Lint all packages

# Building
pnpm build:cli              # Build CLI tool
pnpm build:next             # Build web dashboard

# Database
pnpm db:generate            # Generate database schema
pnpm db:migrate             # Run database migrations
pnpm db:studio              # Open database studio

# CLI Management
pnpm link:cli               # Link CLI globally
pnpm remove:cli             # Unlink CLI
```

## Tech Stack

### Core Technologies

- **Node.js** >= 18 - JavaScript runtime
- **TypeScript** - Type-safe JavaScript
- **pnpm** - Fast, disk space efficient package manager
- **Turborepo** - High-performance build system for monorepos

### Backend

- **Hono** - Fast, lightweight web framework
- **Drizzle ORM** - Type-safe database toolkit
- **PostgreSQL** - Primary database
- **Redis** - Caching and session storage
- **Auth.js** - Authentication framework

### Frontend

- **Next.js 15** - React framework
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn UI** - Accessible component primitives
- **TanStack Query** - Data fetching and caching

### CLI

- **OCLIF** - Open CLI Framework
- **Listr2** - Terminal task lists
- **Chalk** - Terminal styling

### Development Tools

- **Biome** - Fast formatter and linter
- **Turbo** - Build system and caching
- **Docker** - Containerization

## Contributing

We welcome contributions!

## License

This project is licensed under the GPL v3 License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Standalone CodePush Server](https://github.com/microsoft/code-push-server) - Original inspiration

## Author

- [@defnotsuhas](https://github.com/defnotsuhas)

---

<div align="center">
  <p>If you find this project helpful, please consider giving it a ⭐</p>
</div>
