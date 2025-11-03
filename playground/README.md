# Dashboard Playground

This is a Laravel playground application for testing the `@omni-tend/dashboard-for-laravel` package with real server-generated data.

## About

The playground demonstrates the DXTable component with a Products table that includes:
- Server-side pagination using Laravel
- 50 seeded products with realistic data
- Custom cell formatting (price, stock badges)
- Integration with Inertia.js and Vue 3
- Use of the package's `PaginatedResource` for data formatting

## Setup Instructions

### Prerequisites

- PHP 8.2+
- Composer
- Node.js 18+
- NPM

### Installation

The playground is already set up, but if you need to reset it:

1. **Install PHP dependencies:**
   ```bash
   composer install
   ```

2. **Install Node dependencies:**
   ```bash
   npm install
   ```

3. **Database setup (already done):**
   The app uses SQLite with the database file at `database/database.sqlite`.

4. **Run migrations and seeders:**
   ```bash
   php artisan migrate:fresh --seed
   ```
   This will create 50 sample products.

5. **Build frontend assets:**
   ```bash
   npm run build
   # or for development with watch mode:
   npm run dev
   ```

6. **Start the development server:**
   ```bash
   php artisan serve
   ```

7. **Visit the app:**
   Open [http://localhost:8000](http://localhost:8000) in your browser.

## Testing the Package

This playground uses the `@omni-tend/dashboard-for-laravel` package via a file reference (`file:..`) in `package.json`. This means:

- Any changes to the main package will be reflected here after rebuilding
- To rebuild the package: `cd .. && npm run build`
- To rebuild the playground: `npm run build` (or `npm run dev` for watch mode)

## What's Included

### Backend
- **Product Model**: Simple product model with SKU, name, description, price, category, and stock
- **ProductController**: Uses `PaginatedResource` from the package
- **ProductSeeder**: Generates 50 products using Faker
- **SQLite Database**: Lightweight database for testing

### Frontend
- **Products/Index.vue**: Inertia page component using DXTable
- **Custom cell slots**: Price formatting and stock badges
- **Pagination**: Server-side pagination with page change handling

## Key Files

- `app/Http/Controllers/ProductController.php` - Controller using PaginatedResource
- `resources/js/Pages/Products/Index.vue` - DXTable implementation
- `database/seeders/ProductSeeder.php` - Sample data generator
- `routes/web.php` - Route setup

## Package Features Demonstrated

- ✅ DXTable component with server data
- ✅ PaginatedResource for Laravel pagination
- ✅ Custom cell formatting via slots
- ✅ Responsive table layout
- ✅ Bootstrap styling
- ✅ Inertia.js integration

## Development Workflow

1. Make changes to the main package in `../resources/js/components/`
2. Rebuild the package: `cd .. && npm run build`
3. Refresh the playground: Reload the browser (Vite will hot-reload)
4. Test the changes in the Products table

## Resetting Data

To regenerate the sample products:
```bash
php artisan migrate:fresh --seed
```

## Troubleshooting

**Issue**: Package changes not reflected
- **Solution**: Rebuild the main package with `npm run build` from the root directory

**Issue**: Frontend not updating
- **Solution**: Make sure `npm run dev` is running in the playground directory

**Issue**: Database errors
- **Solution**: Run `php artisan migrate:fresh --seed` to reset the database
