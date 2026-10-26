using System.Security.Cryptography;
using AssetRipper.TextureDecoder.Bc;
using AssetRipper.TextureDecoder.Rgb.Formats;
using CUE4Parse.FileProvider;
using CUE4Parse.UE4.Assets.Exports.Texture;
using Newtonsoft.Json;

internal static class TextureExport
{
    public static async Task Run(DefaultFileProvider provider, string root, IEnumerable<string> assets)
    {
        var report = new List<object>();
        foreach (var asset in assets)
        {
            try
            {
                var texture = provider.LoadPackage(asset).GetExports().OfType<UTexture>().Single();
                var mip = texture.GetFirstMip() ?? throw new InvalidDataException("Missing texture mip");
                var bytes = mip.BulkData?.Data ?? throw new InvalidDataException("Missing texture payload");
                byte[] rgba;
                if (texture.Format == EPixelFormat.PF_BC7) Bc7.Decompress<ColorRGBA<byte>, byte>(bytes, mip.SizeX, mip.SizeY, out rgba);
                else if (texture.Format == EPixelFormat.PF_DXT5) Bc3.Decompress<ColorRGBA<byte>, byte>(bytes, mip.SizeX, mip.SizeY, out rgba);
                else throw new InvalidDataException($"Unverified texture codec: {texture.Format}");
                var destination = Path.Combine(root, "textures", Path.GetFileNameWithoutExtension(asset) + ".rgba");
                Directory.CreateDirectory(Path.GetDirectoryName(destination)!);
                if (File.Exists(destination)) throw new IOException("Texture destination already exists; use a fresh output directory");
                await File.WriteAllBytesAsync(destination, rgba);
                report.Add(new { asset, ok = true, width = mip.SizeX, height = mip.SizeY, format = "RGBA8", cookedSha256 = Convert.ToHexString(SHA256.HashData(bytes)), rgbaSha256 = Convert.ToHexString(SHA256.HashData(rgba)), destination });
            }
            catch (Exception error) { report.Add(new { asset, ok = false, error = error.ToString() }); Environment.ExitCode = 1; }
        }
        await File.WriteAllTextAsync(Path.Combine(root, "texture-report.json"), JsonConvert.SerializeObject(report, Formatting.Indented));
    }
}
