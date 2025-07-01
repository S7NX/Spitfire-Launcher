# Setting Up Locally

## 📦 Prerequisites

1. **Install Node.js**
    - Download from [nodejs.org](https://nodejs.org)
2. **Install PNPM**
    - Run the following command in your terminal:
        ```shell
        npm install -g pnpm
        ```
3. **Setup Tauri**
    - See their extensive guide [here](https://v2.tauri.app/start/prerequisites).

## 🚀 Running the App

```shell
pnpm install
pnpm tauri dev
```

Running and building the app for the first time will take a while as it needs to download and compile all the dependencies. Subsequent runs will be much faster.