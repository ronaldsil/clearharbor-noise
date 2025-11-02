import * as fs from "fs";
import * as path from "path";

/**
 * Check static export requirements for Next.js
 * Validates that the codebase doesn't use SSR/ISR/Edge/API routes
 */

let hasErrors = false;

const forbiddenPatterns = [
  {
    pattern: /getServerSideProps/g,
    message: "getServerSideProps is not allowed (use client-side fetching)",
  },
  {
    pattern: /getStaticProps(?!.*generateStaticParams)/g,
    message: "getStaticProps is not allowed (use generateStaticParams for dynamic routes)",
  },
  {
    pattern: /getInitialProps/g,
    message: "getInitialProps is not allowed (use client-side initialization)",
  },
  {
    pattern: /revalidate\s*:/g,
    message: "ISR (revalidate) is not allowed for static export",
  },
  {
    pattern: /['"]use server['"]/g,
    message: "Server actions are not allowed for static export",
  },
  {
    pattern: /from\s+['"]next\/headers['"]/g,
    message: "next/headers is not allowed (SSR-only)",
  },
  {
    pattern: /cookies\(\)/g,
    message: "cookies() is not allowed (SSR-only)",
  },
  {
    pattern: /headers\(\)/g,
    message: "headers() is not allowed (SSR-only)",
  },
  {
    pattern: /dynamic\s*=\s*['"]force-dynamic['"]/g,
    message: "dynamic='force-dynamic' is not allowed for static export",
  },
];

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const relativePath = path.relative(process.cwd(), filePath);

  for (const { pattern, message } of forbiddenPatterns) {
    if (pattern.test(content)) {
      console.error(`❌ ${relativePath}: ${message}`);
      hasErrors = true;
    }
  }
}

function checkDirectory(dirPath, ignorePatterns = []) {
  if (!fs.existsSync(dirPath)) {
    return;
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    // Skip ignored patterns
    if (ignorePatterns.some((pattern) => fullPath.includes(pattern))) {
      continue;
    }

    if (entry.isDirectory()) {
      checkDirectory(fullPath, ignorePatterns);
    } else if (
      entry.isFile() &&
      (entry.name.endsWith(".ts") ||
        entry.name.endsWith(".tsx") ||
        entry.name.endsWith(".js") ||
        entry.name.endsWith(".jsx"))
    ) {
      checkFile(fullPath);
    }
  }
}

function checkDynamicRoutes(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return;
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      // Check if it's a dynamic segment directory (contains '[')
      if (entry.name.includes("[")) {
        // Check for generateStaticParams in page.tsx or page.js
        const pageTsx = path.join(fullPath, "page.tsx");
        const pageJs = path.join(fullPath, "page.js");

        let hasGenerateStaticParams = false;

        if (fs.existsSync(pageTsx)) {
          const content = fs.readFileSync(pageTsx, "utf-8");
          if (/export\s+(async\s+)?function\s+generateStaticParams/.test(content)) {
            hasGenerateStaticParams = true;
          }
        }

        if (fs.existsSync(pageJs)) {
          const content = fs.readFileSync(pageJs, "utf-8");
          if (/export\s+(async\s+)?function\s+generateStaticParams/.test(content)) {
            hasGenerateStaticParams = true;
          }
        }

        if (!hasGenerateStaticParams) {
          console.error(
            `❌ Dynamic route ${path.relative(process.cwd(), fullPath)} must export generateStaticParams`
          );
          hasErrors = true;
        }
      }

      // Recursively check subdirectories
      checkDynamicRoutes(fullPath);
    }
  }
}

console.log("🔍 Checking static export compatibility...\n");

// Check app directory
checkDirectory("./app", ["node_modules", ".next", "out"]);

// Check pages directory (if exists)
checkDirectory("./pages", ["node_modules", ".next", "out", "api"]);

// Check for API routes in app directory
const apiDir = path.join("./app", "api");
if (fs.existsSync(apiDir)) {
  console.error(`❌ API routes (app/api) are not allowed for static export`);
  hasErrors = true;
}

// Check for API routes in pages directory
const pagesApiDir = path.join("./pages", "api");
if (fs.existsSync(pagesApiDir)) {
  console.error(`❌ API routes (pages/api) are not allowed for static export`);
  hasErrors = true;
}

// Check dynamic routes
checkDynamicRoutes("./app");

if (hasErrors) {
  console.error("\n❌ Static export check failed. Please fix the errors above.\n");
  process.exit(1);
} else {
  console.log("✅ All static export checks passed!\n");
}

