# ChatGPT Clone

A full-stack, production-ready ChatGPT clone built with Next.js, OpenAI, MongoDB, Supabase, and Cloudinary. Features real-time chat, image upload and AI analysis, PDF/document support, and user authentication via Clerk.

## Features

- **Real-time Chat**: Interact with AI models (GPT-4o, GPT-4, GPT-3.5, etc.)
- **Image Upload & AI Analysis**: Upload images (PNG, JPG, GIF, WebP, SVG) for GPT-4 Vision analysis
- **PDF & Document Support**: Upload PDFs and DOCX files for content extraction and AI analysis
- **Message History**: Persistent chat history per user
- **Token Usage & Cost Tracking**: See token usage and cost estimates per conversation
- **Authentication**: Secure sign-in/sign-up with Clerk
- **Cloud Storage**: Images stored securely on Cloudinary
- **Vector Memory**: Uses Supabase for vector storage and memory

## Quickstart

### 1. Clone the Repository
```bash
git clone https://github.com/ArnabhS/chatgpt-clone.git
cd chatgpt-clone
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the root directory (see `.env.example`):

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in your credentials:
- [Get OpenAI API Key](https://platform.openai.com/account/api-keys)
- [Get Cloudinary credentials](https://cloudinary.com/)
- [Get MongoDB URI](https://www.mongodb.com/atlas/database)
- [Get Supabase project URL and anon key](https://app.supabase.com/)

### 4. Run the Development Server
```bash
npm run dev
```
Visit [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

| Variable                        | Description                        |
|----------------------------------|------------------------------------|
| `OPENAI_API_KEY`                | OpenAI API key                     |
| `CLOUDINARY_CLOUD_NAME`         | Cloudinary cloud name               |
| `CLOUDINARY_API_KEY`            | Cloudinary API key                  |
| `CLOUDINARY_API_SECRET`         | Cloudinary API secret               |
| `MONGODB_URI`                   | MongoDB connection string           |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL                |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public API key        |

> **Note:** All environment variables are required for full functionality.

## Usage

- **Chat**: Type messages and interact with the AI.
- **Image Upload**: Click the paperclip icon, select an image, and send for analysis.
- **PDF/Doc Upload**: Upload PDF or DOCX files for content extraction and AI analysis.
- **Authentication**: Sign up or sign in with Clerk (email/social login).

## Major Dependencies

- [Next.js](https://nextjs.org/) - React framework for production
- [OpenAI](https://platform.openai.com/) - AI models and vision
- [Cloudinary](https://cloudinary.com/) - Image storage and CDN
- [MongoDB](https://www.mongodb.com/) - Database for chat history
- [Supabase](https://supabase.com/) - Vector store for memory
- [Clerk](https://clerk.com/) - Authentication
- [Radix UI](https://www.radix-ui.com/) - UI primitives
- [Tailwind CSS](https://tailwindcss.com/) - Styling

## Troubleshooting

- **Missing Environment Variables**: Ensure all variables in `.env.example` are set in `.env.local`.
- **MongoDB Connection Errors**: Check your `MONGODB_URI` and network/firewall settings.
- **Cloudinary Upload Issues**: Verify your Cloudinary credentials and account status.
- **OpenAI API Errors**: Ensure your API key is valid and has sufficient quota.
- **Supabase Errors**: Check your Supabase URL and anon key.

## Contributing

1. Fork the repo and create your branch: `git checkout -b feature/your-feature`
2. Commit your changes: `git commit -am 'Add new feature'`
3. Push to the branch: `git push origin feature/your-feature`
4. Open a pull request

## License

MIT

---

_This project is not affiliated with OpenAI or ChatGPT. For educational and demonstration purposes only._
