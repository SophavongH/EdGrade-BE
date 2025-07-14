import ImageKit from "imagekit";

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY!,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT!,
});

export async function uploadToImageKit(base64: string, fileName: string) {
  const res = await imagekit.upload({
    file: base64,
    fileName,
    folder: "students",
  });
  return res.url; // Return the hosted URL
}