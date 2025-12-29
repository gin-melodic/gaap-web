# GAAP Web

A modern, feature-rich personal finance and accounting dashboard built with **Next.js 16** and **React 19**. This application helps users track assets, manage accounts, and visualize financial data with a premium, responsive user interface.

## 🚀 Key Features

- **💰 Account Management**: 
  - Create, edit, and categorize accounts (Cash, Bank, Credit Cards, Investments, etc.).
  - Group accounts for better organization.
  - "Save and Continue" functionality for rapid data entry.
- **📊 Analytics & Charts**: 
  - Interactive charts powered by **Recharts**.
  - Smart asset selection logic (All Assets vs. Specific Accounts).
  - Visual breakdown of financial health.
- **🌍 Internationalization (i18n)**: 
  - Full language support for:
    - 🇺🇸 English (`en`)
    - 🇨🇳 Chinese Simplified (`zh-CN`)
    - 🇹🇼 Chinese Traditional (`zh-TW`)
    - 🇯🇵 Japanese (`ja`)
  - Seamless language switching with persistent preferences.
- **🎨 Modern UI/UX**: 
  - Built with **Tailwind CSS v4** and **Radix UI** primitives.
  - **Dark Mode** support via `next-themes`.
  - Smooth animations and transitions.
  - Responsive design for all device sizes.
  - Toast notifications (via **Sonner**) for user feedback.
- **🔐 Authentication & Settings**:
  - Secure login flow with redirection handling.
  - Subscription plan management.
  - Customizable user settings.

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/), [clsx](https://github.com/lukeed/clsx), [tailwind-merge](https://github.com/dcastil/tailwind-merge)
- **Components**: [Radix UI](https://www.radix-ui.com/), [Lucide React](https://lucide.dev/) (Icons)
- **Charts**: [Recharts](https://recharts.org/)
- **Internationalization**: [i18next](https://www.i18next.com/), [react-i18next](https://react.i18next.com/)
- **Utilities**: [Sonner](https://sonner.emilkowal.ski/) (Toasts)

## 🏁 Getting Started

First, install the dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📂 Project Structure

- `src/app`: Next.js App Router pages and layouts.
- `src/components`: Reusable UI components and feature-specific widgets.
  - `features/`: Complex feature components (Accounts, Transactions, etc.).
  - `ui/`: Base UI components (Buttons, Inputs, Modals).
- `src/locales`: Translation JSON files for i18n.
- `src/lib`: Utility functions and configurations.

## 🔄 Recent Updates

- **Internationalization Complete**: Added full translation support for Traditional Chinese and Japanese across all modals and settings.
- **UI Refinements**: Improved "Add Account" modal width, added tooltips for clarity, and implemented success toast notifications.
- **Chart Logic**: Enhanced multi-select behavior for asset visualization.
- **Bug Fixes**: Resolved logout redirection issues and deprecated icon imports.
