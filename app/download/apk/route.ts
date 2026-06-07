import { NextResponse } from "next/server";
import { APP_VERSION } from "@/lib/app-version";

export async function GET() {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const owner = "TechEagle001";
  const repo = "mbingwa-app";
  const assetName = `m-bingwa-v${APP_VERSION}.apk`;

  try {
    // Get release by tag
    const releaseRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/releases/tags/v${APP_VERSION}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
        },
      }
    );

    if (!releaseRes.ok) {
      return NextResponse.json({ error: "Release not found" }, { status: 404 });
    }

    const release = await releaseRes.json();
    const asset = release.assets?.find((a: any) => a.name === assetName);

    if (!asset) {
      return NextResponse.json({ error: "APK not found in release" }, { status: 404 });
    }

    // Stream the APK through our server
    const apkRes = await fetch(asset.url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/octet-stream",
      },
    });

    if (!apkRes.ok) {
      return NextResponse.json({ error: "Failed to fetch APK" }, { status: 502 });
    }

    return new NextResponse(apkRes.body, {
      headers: {
        "Content-Type": "application/vnd.android.package-archive",
        "Content-Disposition": `attachment; filename="${assetName}"`,
        "Content-Length": asset.size.toString(),
      },
    });
  } catch {
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
