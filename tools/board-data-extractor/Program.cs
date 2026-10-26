using System.Diagnostics;
using System.Security.Cryptography;
using System.Text.RegularExpressions;
using CUE4Parse;
using CUE4Parse.Compression;
using CUE4Parse.FileProvider;
using CUE4Parse.MappingsProvider.Usmap;
using CUE4Parse.UE4.Versions;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Serilog;

var options = args.Where(arg => arg.StartsWith("--") && arg.Contains('=')).ToDictionary(arg => arg[2..arg.IndexOf('=')], arg => arg[(arg.IndexOf('=')+1)..]);
string Required(string key) => options.TryGetValue(key, out var value) && value.Length > 0 ? value : throw new ArgumentException($"Missing --{key}=...");
var researchRoot = Path.GetFullPath(Required("output"));
var mode = options.GetValueOrDefault("mode", "inventory");
if (!new[]{"inventory","abilities","scripts","assets","terrain-probe","terrain-scene","textures"}.Contains(mode)) throw new ArgumentException("Unknown extraction mode");
var gameRoot = Path.GetFullPath(options.GetValueOrDefault("paks", @"C:\Riot Games\VALORANT\live\ShooterGame\Content\Paks"));
var mappings = Path.GetFullPath(Required("mappings"));
var oodle = Path.GetFullPath(Required("oodle"));
var gameBuild = Required("build");
var manifestId = Required("manifest");
var metadataPath = Path.GetFullPath(options.GetValueOrDefault("metadata", @"C:\ProgramData\Riot Games\Metadata\valorant.live\valorant.live.ok"));
var metadata = await File.ReadAllBytesAsync(metadataPath);
if (!System.Text.Encoding.UTF8.GetString(metadata).Contains(manifestId+".manifest",StringComparison.OrdinalIgnoreCase)) throw new InvalidDataException("The installed manifest differs from --manifest");
if (!File.Exists(oodle)) throw new FileNotFoundException("Supply the local Oodle library explicitly",oodle);
var mappingHash = Convert.ToHexString(SHA256.HashData(await File.ReadAllBytesAsync(mappings)));
Directory.CreateDirectory(researchRoot);
var identity = new { sourceBuild=gameBuild,manifest=manifestId,mappingSha256=mappingHash,installationMetadataHash=Convert.ToHexString(SHA256.HashData(metadata)) };
var identityJson = JsonConvert.SerializeObject(identity,Formatting.Indented);
var identityPath = Path.Combine(researchRoot,"extraction-session.json");
if (File.Exists(identityPath)) {
 if (!JToken.DeepEquals(JToken.Parse(await File.ReadAllTextAsync(identityPath)),JToken.Parse(identityJson))) throw new InvalidDataException("Use a fresh output directory for a different game/mapping build");
} else if (Directory.Exists(Path.Combine(researchRoot,"raw")) || Directory.Exists(Path.Combine(researchRoot,"terrain"))) throw new InvalidDataException("Output contains exports without a matching extraction identity; use a fresh directory");
else await File.WriteAllTextAsync(identityPath,identityJson);
var assets = args.Where(arg => !arg.StartsWith("--")).ToArray();
Log.Logger = new LoggerConfiguration().MinimumLevel.Warning().WriteTo.File(Path.Combine(researchRoot,mode+"-parser.log")).CreateLogger();
CUE4ParseLog.UseLogger(Log.Logger);
await OodleHelper.InitializeAsync(oodle);
using var provider = new DefaultFileProvider(gameRoot, SearchOption.TopDirectoryOnly, new VersionContainer(EGame.GAME_Valorant), StringComparer.OrdinalIgnoreCase);
provider.ReadScriptData = mode=="scripts";
provider.MappingsContainer = new FileUsmapTypeMappingsProvider(mappings);
var watch = Stopwatch.StartNew();
provider.Initialize();
provider.Mount();
Console.WriteLine($"Mounted {provider.MountedVfs.Count} containers; {provider.Files.Count} files; {provider.UnloadedVfs.Count} unmounted; {watch.ElapsedMilliseconds}ms");
var inventory = provider.Files.Keys.Order(StringComparer.OrdinalIgnoreCase).ToArray();
await File.WriteAllLinesAsync(Path.Combine(researchRoot,"inventory.txt"),inventory);
if(mode=="inventory") return;
if(mode=="terrain-probe"||mode=="terrain-scene"){await TerrainProbe.Run(provider,researchRoot,assets,gameBuild,manifestId,mode=="terrain-scene");return;}
var byName=inventory.Where(p=>p.EndsWith(".uasset",StringComparison.OrdinalIgnoreCase)).GroupBy(p=>Path.GetFileNameWithoutExtension(p),StringComparer.OrdinalIgnoreCase).ToDictionary(g=>g.Key,g=>g.ToArray(),StringComparer.OrdinalIgnoreCase);
var queue = new Queue<string>();
var enqueued = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
var nativeReferences = new HashSet<string>();
var missing = new List<object>();
var publicBindings = new List<object>();
void Enqueue(string path) {
 if(enqueued.Add(path)) queue.Enqueue(path);
}
string? PackageFile(string reference){
 var path=reference.Split('.')[0];
 if(path.StartsWith("/Game/")) path="ShooterGame/Content/"+path[6..];
 else if(path.StartsWith("/Engine/")) path="Engine/Content/"+path[8..];
 else { if(path.StartsWith("/Script/")) nativeReferences.Add(path); return null; }
 path+=".uasset";
 return provider.Files.TryGetValue(path,out var file) ? file.Path : null;
}
if(mode=="abilities"){
 var bindings=JArray.Parse(await File.ReadAllTextAsync(Path.GetFullPath(Required("bindings"))));
 if(bindings.Count!=116 || bindings.OfType<JObject>().Select(row=>$"{row["agentId"]}:{row["slot"]}").Distinct().Count()!=116) throw new InvalidDataException("Expected 116 explicit active UUID/slot bindings");
 foreach(var binding in bindings){
  var found=new List<string>();
  foreach(var package in binding["packages"]!.Values<string>()) {
   if(package is not null && provider.Files.TryGetValue(package,out var file)){Enqueue(file.Path);found.Add(file.Path);}
   else missing.Add(new{agentId=binding["agentId"]?.ToString(),slot=binding["slot"]?.ToString(),package});
  }
  publicBindings.Add(new{agentId=binding["agentId"]?.ToString(),slot=binding["slot"]?.ToString(),packages=found});
 }
 await File.WriteAllTextAsync(Path.Combine(researchRoot,"ability-package-bindings.json"),JsonConvert.SerializeObject(publicBindings,Formatting.Indented));
}else foreach(var asset in assets) Enqueue(asset);
if(mode=="textures"){await TextureExport.Run(provider,researchRoot,assets);return;}
var records = new List<object>();
while(queue.TryDequeue(out var asset)){
 if(records.Count>=15000) throw new Exception("Dependency scan exceeded safety limit");
 try{
  var destination=Path.Combine(researchRoot,mode=="scripts"?"scripts-raw":"raw",asset.Replace('/',Path.DirectorySeparatorChar)+".json");
  string json;
  var cached=File.Exists(destination);
  if(cached) json=await File.ReadAllTextAsync(destination);
  else {
   var objects=provider.LoadPackage(asset).GetExports();
   json=JsonConvert.SerializeObject(objects,Formatting.Indented);
   Directory.CreateDirectory(Path.GetDirectoryName(destination)!);
   await File.WriteAllTextAsync(destination,json);
  }
  var exports=JArray.Parse(json);
  var dependencies=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
  foreach(var obj in exports.OfType<JObject>()){
   foreach(var kind in new[]{"Template","Super","SuperStruct"}){
    if(obj[kind]?["ObjectPath"]?.Value<string>() is string reference && PackageFile(reference) is string dependency) dependencies.Add(dependency);
   }
   if(obj["Class"]?.Value<string>() is string className){
    var match=Regex.Match(className,@"'(/(?:Game|Engine)/[^']+)'");
    if(match.Success && PackageFile(match.Groups[1].Value) is string dependency) dependencies.Add(dependency);
   }
   if(mode=="abilities"){
    foreach(var reference in obj.Descendants().OfType<JObject>().Where(x=>x["ObjectPath"]!=null && x["ObjectName"]!=null)){
     var name=reference["ObjectName"]!.Value<string>()!;
     if(!(name.StartsWith("BlueprintGeneratedClass'") || name.StartsWith("CurveFloat'") || name.StartsWith("CurveVector'") || name.StartsWith("DataTable'") || name.StartsWith("BehaviorTree'"))) continue;
     var path=reference["ObjectPath"]!.Value<string>()!;
     if(Regex.IsMatch(path,@"/(FXC_|VFX/|SFX/|Audio/|Anims/|Animations/|Meshes/|Materials/)",RegexOptions.IgnoreCase)) continue;
     if(PackageFile(path) is string dependency) dependencies.Add(dependency);
    }
   }
  }
  foreach(var dependency in dependencies) Enqueue(dependency);
  records.Add(new{asset,ok=true,exports=exports.Count,destination,cached,jsonSha256=Convert.ToHexString(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(json))),dependencies=dependencies.ToArray()});
 }catch(Exception error){records.Add(new{asset,ok=false,error=error.ToString()});}
 if(records.Count%100==0) Console.WriteLine($"Processed {records.Count}; queued {queue.Count}; elapsed {watch.Elapsed.TotalSeconds:F1}s");
}
await File.WriteAllTextAsync(Path.Combine(researchRoot,$"{(mode=="abilities"?"allpublic":mode)}-report.json"),JsonConvert.SerializeObject(new{parser="CUE4Parse",parserVersion="1.2.2.202610",game="GAME_Valorant",manifest=manifestId,sourceBuild=gameBuild,mappingSha256=mappingHash,mounted=provider.MountedVfs.Count,unmounted=provider.UnloadedVfs.Count,missingPublicPackages=missing,nativeReferences=nativeReferences.ToArray(),records},Formatting.Indented));
Console.WriteLine($"Processed {records.Count} assets in {watch.Elapsed.TotalSeconds:F1}s; unresolved public package names {missing.Count}");




if(records.Any(record => JObject.FromObject(record)["ok"]?.Value<bool>()==false) || missing.Count>0) Environment.ExitCode=1;
