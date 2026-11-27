import { Capacitor } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

export async function shareCsv(filename: string, csv: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return;
  }
  const written = await Filesystem.writeFile({
    path: filename,
    data: csv,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  });
  await Share.share({
    title: "DeyeView energy report",
    text: "Energy report exported from DeyeView",
    url: written.uri,
    dialogTitle: "Share energy report",
  });
}
