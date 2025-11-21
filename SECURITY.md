# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.4.x   | :white_check_mark: |
| < 0.4.0 | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security vulnerability, please follow these steps:

### 1. Do Not Open a Public Issue

Please **do not** create a public GitHub issue for security vulnerabilities.

### 2. Email Us Privately

Send details to: **james@omnitend.com**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)

### 3. What to Expect

- **Response time**: We aim to respond within 48 hours
- **Updates**: We'll keep you informed of our progress
- **Credit**: We'll credit you in the security advisory (unless you prefer to remain anonymous)
- **Timeline**: We aim to release a fix within 7 days for critical vulnerabilities

## Security Best Practices

When using this package:

### Backend Security

1. **Always validate input** using Laravel's validation
2. **Whitelist sortable columns** - Never trust client-side sort parameters
3. **Whitelist filterable fields** - Validate all filter inputs
4. **Use prepared statements** - Laravel's query builder does this automatically
5. **Implement rate limiting** on API endpoints
6. **Use CSRF protection** - Laravel provides this out of the box

Example of secure controller:

```php
class ProductController extends Controller
{
    // Whitelist allowed sort columns
    protected array $allowedSortColumns = ['name', 'price', 'created_at'];

    public function index(Request $request)
    {
        $sortBy = $request->input('sortBy', 'created_at');

        // Validate sort column against whitelist
        if (!in_array($sortBy, $this->allowedSortColumns)) {
            $sortBy = 'created_at';
        }

        // Safe to use in query
        $products = Product::orderBy($sortBy, 'desc')->paginate(15);

        return new PaginatedResource($products);
    }
}
```

### Frontend Security

1. **Sanitize user input** before rendering (Vue does this automatically for interpolation)
2. **Use `v-text` or `{{ }}` instead of `v-html`** unless absolutely necessary
3. **Validate file uploads** on both client and server
4. **Use HTTPS** in production
5. **Keep dependencies updated** - Run `npm audit` regularly

### Authentication

1. **Use Laravel Sanctum or Passport** for API authentication
2. **Implement proper CORS policies**
3. **Use secure session cookies**
4. **Implement proper logout** on both client and server

## Known Security Considerations

### XSS Protection

Vue.js automatically escapes interpolated content, but be aware:
- Don't use `v-html` with user-generated content
- Sanitize data before using in attributes that accept URLs
- Be cautious with dynamic component rendering

### CSRF Protection

When using with Inertia.js:
- CSRF protection is automatic
- No additional configuration needed

When using API mode:
- Include CSRF token in requests
- Laravel Sanctum handles this for authenticated users

## Dependency Security

We regularly update dependencies to patch security vulnerabilities. To check for vulnerabilities:

```bash
# NPM
npm audit

# Composer
composer audit
```

## Questions?

If you have questions about security that don't involve a vulnerability, feel free to open a GitHub issue.
