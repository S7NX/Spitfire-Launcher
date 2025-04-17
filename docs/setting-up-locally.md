# Setting Up Locally

## 📦 Prerequisites

1. **Install Node.js**
    - Download from [nodejs.org](https://nodejs.org)
2. **Install PNPM**
    - PowerShell: `Invoke-WebRequest https://get.pnpm.io/install.ps1 -UseBasicParsing | Invoke-Expression`
    - Linux: `curl -fsSL https://get.pnpm.io/install.sh | sh -`
3. **Setup Tauri and Its Dependencies**
    - See their extensive guide [here](https://v2.tauri.app/start/prerequisites). Only install build tools and Rust.

## 🚀 Running the App

```shell
pnpm install
pnpm run tauri dev
# or to build: pnpm run tauri build
```

Running and building the app for the first time will take a while as it needs to download and compile all the dependencies. Subsequent runs will be much faster.