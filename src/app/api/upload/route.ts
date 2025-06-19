import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
}

export async function POST(req: NextRequest) {
  try {
  const data = await req.formData();
  const file = data.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

  const buffer = Buffer.from(await file.arrayBuffer());

    const upload = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
    cloudinary.uploader
        .upload_stream(
          {
            resource_type: "image",
            folder: "chat-images",
            allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
            transformation: [
              { width: 800, height: 600, crop: "limit" },
              { quality: "auto", fetch_format: "auto" }
            ]
          },
          function (error, result) {
        if (error) reject(error);
            else resolve(result as CloudinaryUploadResult);
          }
        )
      .end(buffer);
  });

    return NextResponse.json({
      url: upload.secure_url,
      publicId: upload.public_id,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      isImage: true
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({
      error: "Failed to upload file. Please try again."
    }, { status: 500 });
}
} 