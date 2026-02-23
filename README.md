# BEUShareBox
# BEUShareBox

BEUShareBox is a mini social product-sharing platform built with vanilla HTML, CSS, and JavaScript.
It includes modern SaaS-style UI, profile management, product interactions, filtering/sorting, import/export, theme switching, and link-based product auto-fill.

## Live Features

### Product Management
- Add product with title, description, price, category, and optional image
- Like products
- Comment on products
- Delete products with confirmation
- Product detail modal with full info
- Open original product source link (when available)

### Smart Product Input
- Paste a product URL and auto-fill fields
- Auto-detect title, description, category, and possible price
- Save source URL to reopen the original listing

### User Profiles
- Create/save multiple profiles
- Switch between profiles
- Upload avatar
- Add profile bio
- Delete saved profile
- "My Products" filter by current profile

### Filtering, Search, and Sorting
- Category filter
- Search by title/description
- Sort by newest, price (asc/desc), likes

### Dashboard and Stats
- Total products
- Total likes
- Most liked product
- Category distribution

### Data Portability
- Export app data to JSON (Blob API)
- Import JSON and safely merge with existing data
- Collision-safe ID handling

### UX Enhancements
- Responsive layout
- Animated card/filter transitions
- Toast notifications
- Dark/Light mode toggle with saved preference

## Tech Stack
- HTML5
- CSS3 (custom properties + keyframes)
- JavaScript (ES6+, modular object-based architecture)
- Browser APIs: `localStorage`, `FileReader`, `Blob`, `URL.createObjectURL`, `fetch`

## Project Structure

```text
.
├─ index.html
├─ style.css
└─ app.js
```

## How to Run

1. Clone or download this repository.
2. Open `index.html` in your browser.

For best development experience, use a local server (optional):

```bash
# Example (VS Code Live Server extension) or any static server
```

## Data Storage

The app stores data in browser localStorage:
- `beu-sharebox-products`
- `beu-sharebox-profile`
- `beu-sharebox-profiles`
- `beu-sharebox-theme`

## Notes

- Link auto-fill depends on metadata availability from target sites.
- Some websites may block metadata access; in those cases auto-fill may be partial.
- Imported JSON is normalized and merged safely to avoid breaking existing data.

## License

This project is provided for learning and portfolio use.
