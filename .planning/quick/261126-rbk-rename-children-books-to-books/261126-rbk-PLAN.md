---
phase: quick-261126-rbk
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/Header.jsx
  - src/components/Footer.jsx
  - src/routes/Home.jsx
  - src/routes/Books.jsx
  - src/routes/Subscribe.jsx
  - src/data/seo.js
  - src/data/products.js
  - lib/products.js
  - public/assets/images/MANIFEST.md
autonomous: true
requirements: [RENAME-CHILDREN-BOOKS-TO-BOOKS]

must_haves:
  truths:
    - "Navigation items in header and footer say Books"
    - "Books page heading is Books"
    - "Home page section link says Books →"
    - "SEO and subscribe copy updated to refer to books"
    - "Build and prerender complete cleanly"
---

# Plan: Rename Children's Books to Books

## Tasks
1. Update navigation in `src/components/Header.jsx` and `src/components/Footer.jsx`.
2. Update page title in `src/routes/Books.jsx` to `<h1 className="display">Books</h1>`.
3. Update Home section link in `src/routes/Home.jsx` to `Books →`.
4. Update `src/data/seo.js`, `src/routes/Subscribe.jsx`, `src/data/products.js`, `lib/products.js`, and `public/assets/images/MANIFEST.md`.
5. Verify build and prerender with `npm run build`.
