This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Features

### Image Upload & AI Analysis
- Upload images (PNG, JPG, GIF, WebP, SVG) for AI analysis
- Images are automatically sent to GPT-4 Vision for intelligent analysis
- Simple click-to-upload interface (no drag & drop)
- Images are stored securely on Cloudinary
- Maximum file size: 10MB

### Chat Interface
- Real-time chat with AI models
- Support for multiple AI models (GPT-4, GPT-3.5, etc.)
- Message history and conversation management
- Token usage tracking and cost estimation

## Getting Started

### Prerequisites
- Node.js 18+ 
- Cloudinary account
- OpenAI API key

### Environment Variables
Create a `.env.local` file with the following variables:

```bash
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key
```

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## How to Use Image Analysis

1. Click the paperclip icon in the chat input
2. Select an image file (PNG, JPG, GIF, WebP, SVG)
3. The image will be uploaded to Cloudinary
4. Send your message with the image
5. The AI will analyze the image using GPT-4 Vision and provide insights

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
