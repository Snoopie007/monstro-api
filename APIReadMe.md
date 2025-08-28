# 🚀 Folder-Based API Routing for Bun

A simple Next.js App Router-style folder-based routing system for Bun that automatically maps folders in the `src/api/` directory to API endpoints.

## 📁 How It Works

Just like Next.js App Router, create folders with `route.ts` files and they automatically become API endpoints:

```
src/api/
├── route.ts          → GET /api/
├── users/
│   ├── route.ts      → GET/POST /api/users
│   └── [id]/
│       └── route.ts  → GET/PUT/DELETE /api/users/:id
```

## 🔧 Route Handler Format

Each `route.ts` file exports async functions for HTTP methods:

```typescript
// Simple and clean - just export the functions you need!

export async function GET(req: Request, params: Record<string, string>) {
  return new Response(JSON.stringify({ message: "Hello!" }), {
    headers: { "Content-Type": "application/json" }
  });
}

export async function POST(req: Request, params: Record<string, string>) {
  const body = await req.json();
  // Handle POST request
  return new Response(JSON.stringify({ success: true }));
}
```

## 🎯 Dynamic Routes

Use `[param]` folder names for dynamic segments:

- `src/api/users/[id]/route.ts` → `/api/users/123` (params.id = "123")
- `src/api/posts/[slug]/route.ts` → `/api/posts/hello-world` (params.slug = "hello-world")

```typescript
export async function GET(req: Request, params: Record<string, string>) {
  const { id } = params; // Extract the dynamic parameter
  return new Response(JSON.stringify({ userId: id }));
}
```

## 🚀 Getting Started

1. **Start the server:**
   ```bash
   bun run dev
   ```

2. **Visit the endpoints:**
   - http://localhost:3000/ - Landing page with all endpoints
   - http://localhost:3000/api/ - API info
   - http://localhost:3000/api/users - Users collection
   - http://localhost:3000/api/users/1 - Specific user

## 📝 Example Endpoints

The system comes with example routes:

- `GET /api/` - API information
- `GET /api/users` - List all users
- `POST /api/users` - Create a new user
- `GET /api/users/[id]` - Get user by ID
- `PUT /api/users/[id]` - Update user by ID  
- `DELETE /api/users/[id]` - Delete user by ID

## 🔧 Features

- ✅ File-based routing (like Next.js)
- ✅ Dynamic routes with `[param]` syntax
- ✅ Support for all HTTP methods (GET, POST, PUT, DELETE, PATCH)
- ✅ Automatic route registration
- ✅ Type-safe route handlers
- ✅ Error handling
- ✅ Clean URL patterns

## 📦 Adding New Routes

1. Create a new folder in the `src/api/` directory
2. Add a `route.ts` file with your `RouteHandler`
3. The route is automatically available!

**Example: Create `src/api/health/route.ts`**
```typescript
export async function GET(req: Request, params: Record<string, string>) {
  return new Response(JSON.stringify({ 
    status: "healthy",
    timestamp: new Date().toISOString()
  }), {
    headers: { "Content-Type": "application/json" }
  });
}
```

This automatically creates `GET /api/health` endpoint!

## 🎨 Multiple Export Styles Supported

The router is flexible and supports different ways to export your handlers:

### 1. Named Function Exports (Recommended)
```typescript
export async function GET(req: Request, params: Record<string, string>) {
  return new Response(JSON.stringify({ method: "GET" }));
}

export async function POST(req: Request, params: Record<string, string>) {
  return new Response(JSON.stringify({ method: "POST" }));
}
```

### 2. Object Export (Legacy)
```typescript
import type { RouteHandler } from "../router";

const handler: RouteHandler = {
  GET: async (req, params) => {
    return new Response(JSON.stringify({ method: "GET" }));
  }
};

export default handler;
```

### 3. Single Function Export (GET only)
```typescript
export default async function(req: Request, params: Record<string, string>) {
  return new Response(JSON.stringify({ message: "Hello!" }));
}
```

## 🔄 Migration from File-Based

The router supports both folder-based (preferred) and file-based routing for backward compatibility. However, folder-based routing is recommended for new projects.
