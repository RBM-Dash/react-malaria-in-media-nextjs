# GitHub Pages Setup for `articles.json` and Integration Plan

This document outlines the steps taken to make the `articles.json` file publicly accessible via GitHub Pages and details the plan for integrating this into the dashboard's data fetching process.

## 1. GitHub Pages Setup

The `articles.json` file is now hosted on GitHub Pages, providing a static, publicly accessible URL for external services (like Google Apps Script) to fetch it.

**Repository:** `https://github.com/RBM-Dash/react-malaria-in-media-nextjs`

**GitHub Pages URL for `articles.json`:**
`https://rbm-dash.github.io/react-malaria-in-media-nextjs/articles.json`

**Configuration Steps (performed on GitHub.com):**

1.  Navigated to the repository: `https://github.com/RBM-Dash/react-malaria-in-media-nextjs`
2.  Clicked on **"Settings"** tab.
3.  Clicked on **"Pages"** in the left sidebar.
4.  Under "Build and deployment" > "Source":
    *   Selected **"Deploy from a branch"**.
    *   Selected **`main`** for the "Branch".
    *   Selected **`/ (root)`** for the folder.
5.  Clicked **"Save"**.

**Note:** The `articles.json` file was copied from `public/articles.json` to the root of the repository (`articles.json`) to be served by GitHub Pages from the `/ (root)` folder.

## 2. Plan for `fetch_data.js` Automation

The `fetch_data.js` script needs to be updated to automatically push the new `articles.json` to GitHub after it's generated. This will ensure that the GitHub Pages version of `articles.json` is always up-to-date.

**Proposed Changes to `fetch_data.js` (or a wrapper script):**

1.  **Generate `articles.json`:** The script will continue to generate `articles.json` in the `public/` directory.
2.  **Copy to Root:** Copy the newly generated `public/articles.json` to the project root (`articles.json`).
3.  **Git Operations:**
    *   `git add articles.json` (to stage the updated file in the root).
    *   `git commit -m "chore: Update articles.json via fetch_data script"` (or a similar automated message).
    *   `git push origin main` (to push the changes to GitHub, triggering a GitHub Pages update).

**Considerations for Automation:**

*   **Git Credentials:** For automated `git push`, you might need to configure Git credentials (e.g., using a Git Credential Manager or SSH keys without passphrases) so that the script doesn't prompt for username/password.
*   **Error Handling:** Implement robust error handling for Git commands.

## 3. Plan for Local Dashboard Page (`app/page.tsx`)

The local dashboard application currently fetches `articles.json` from its local `public/` directory. To ensure it uses the same data source as the Google Apps Script (and to test the GitHub Pages integration), it should be updated to fetch `articles.json` from the GitHub Pages URL.

**Proposed Change to `app/page.tsx`:**

*   Modify the `fetchArticles` function in `app/page.tsx` to fetch from `https://rbm-dash.github.io/react-malaria-in-media-nextjs/articles.json` instead of `/articles.json`.

```typescript
// In app/page.tsx
useEffect(() => {
  const fetchArticles = async () => {
    try {
      // Change this line:
      const res = await fetch('https://rbm-dash.github.io/react-malaria-in-media-nextjs/articles.json');
      // Instead of:
      // const res = await fetch('/articles.json');

      let data = await res.json();
      // ... rest of the filtering and setting state
    } catch (error) {
      console.error('Error fetching articles:', error);
    }
  };
  fetchArticles();
}, []);
```

## 4. Google Apps Script Integration (Next Steps)

Once `fetch_data.js` is automated to push to GitHub and the dashboard fetches from GitHub Pages, the final step will be to write the Google Apps Script.

**Google Apps Script will:**

1.  Fetch `articles.json` from `https://rbm-dash.github.io/react-malaria-in-media-nextjs/articles.json`.
2.  Upload this content to a specific file on your Google Drive.
3.  Be scheduled to run daily.

This document provides a clear roadmap for your developers.
