# SportsEdge Coming Soon Page - Linux Deployment Guide

## Prerequisites
- Node.js 18+ and npm installed
- Linux server with web server (Nginx/Apache)
- Domain pointing to your server
- SSL certificate (recommended)

## Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Add Hero Background Image
Download your futuristic soccer background image and save it as:
```
public/images/hero-soccer-futuristic.jpg
```

Or update the image path in `App.tsx` line 51:
```javascript
backgroundImage: `url('/images/your-hero-image.jpg')`,
```

### 3. Configure EmailJS (Optional)
If you want email collection to work:

1. Sign up at [emailjs.com](https://www.emailjs.com)
2. Get your Service ID, Template ID, and Public Key
3. Update these values in `App.tsx` lines 22-32:
```javascript
emailjs.init("YOUR_PUBLIC_KEY");
await emailjs.send(
  "YOUR_SERVICE_ID",
  "YOUR_TEMPLATE_ID",
  // ...
);
```

### 4. Build for Production
```bash
npm run build
```

This creates a `dist/` folder with your optimized website.

## Deployment Options

### Option A: Static Hosting (Recommended)
Upload the `dist/` folder contents to any static hosting service:
- **Netlify**: Drag & drop the `dist` folder
- **Vercel**: Connect your GitHub repo
- **AWS S3**: Upload to S3 bucket with static hosting
- **DigitalOcean App Platform**: Deploy from GitHub

### Option B: Linux Server with Nginx

1. **Upload files to server:**
```bash
scp -r dist/* user@your-server:/var/www/sportsedge/
```

2. **Create Nginx configuration:**
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    root /var/www/sportsedge;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Gzip compression
    gzip on;
    gzip_types text/css application/javascript image/svg+xml;
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

3. **Enable the site:**
```bash
sudo ln -s /etc/nginx/sites-available/sportsedge /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

4. **SSL with Let's Encrypt:**
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Option C: Apache Server

1. **Upload files:**
```bash
scp -r dist/* user@your-server:/var/www/html/sportsedge/
```

2. **Create .htaccess in the root:**
```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

# Enable gzip compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/css application/javascript image/svg+xml
</IfModule>

# Cache static assets
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
</IfModule>
```

## File Structure After Build
```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── [other assets]
└── images/
    └── hero-soccer-futuristic.jpg
```

## Performance Optimization

### Image Optimization
- Use WebP format for the hero image for better compression
- Add different sizes for responsive loading:
```html
<picture>
  <source srcset="hero-small.webp" media="(max-width: 768px)">
  <source srcset="hero-large.webp" media="(min-width: 769px)">
  <img src="hero-soccer-futuristic.jpg" alt="Futuristic Soccer">
</picture>
```

### CDN Setup
Consider using a CDN like Cloudflare for:
- Global content delivery
- Automatic image optimization
- DDoS protection
- SSL certificates

## Monitoring & Analytics

### Add Google Analytics (Optional)
Add to `index.html` before closing `</head>`:
```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

## Troubleshooting

### Common Issues:
1. **White screen**: Check browser console for errors
2. **Images not loading**: Verify image paths and file existence
3. **EmailJS not working**: Check API keys and browser console
4. **Fonts not loading**: Verify Google Fonts connection

### Development Mode:
```bash
npm run dev
```
Visit `http://localhost:3000` to test locally.

## Security Considerations
- Use HTTPS in production
- Set proper Content Security Policy headers
- Regular dependency updates: `npm audit fix`

Your SportsEdge coming soon page is now ready for production! 🚀