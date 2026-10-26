using System.Security.Cryptography;
using CUE4Parse.FileProvider;
using CUE4Parse.UE4.Assets.Exports;
using CUE4Parse.UE4.Assets.Exports.StaticMesh;
using CUE4Parse.UE4.Objects.PhysicsEngine;
using CUE4Parse.UE4.Objects.NavigationSystem.NavMesh;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

internal static class TerrainProbe {
 public static async Task Run(DefaultFileProvider provider,string root,IEnumerable<string> assets,string sourceBuild,string manifestId,bool followScene=false){
  var reports=new List<object>();
  var queue=new Queue<string>(assets); var seen=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
  while(queue.TryDequeue(out var asset)){
   if(!seen.Add(asset))continue;
   if(seen.Count>15000)throw new Exception("Scene dependency bound exceeded");
   try {
    var exports=provider.LoadPackage(asset).GetExports().ToArray();
    var json=JArray.Parse(JsonConvert.SerializeObject(exports));
    var shapes=new List<object>();var meshes=new List<object>();var tiles=new List<object>();
    var destination=Path.Combine(root,"terrain",asset.Replace('/',Path.DirectorySeparatorChar)+".json");
    Directory.CreateDirectory(Path.GetDirectoryName(destination)!);
    for(var index=0;index<exports.Length;index++){
     var obj=exports[index];
     if(obj is UBodySetup body){
      var formats=new List<object>();
      foreach(var format in body.CookedFormatData?.Formats??[]){
       var bytes=format.Value.Data;
       if(bytes is null)continue;
       var binPath=destination+"."+index+"."+format.Key.Text+".bin";
       await File.WriteAllBytesAsync(binPath,bytes);
       formats.Add(new{format=format.Key.Text,bytes=bytes.Length,sha256=Convert.ToHexString(SHA256.HashData(bytes)),path=binPath});
      }
      shapes.Add(new{index,name=obj.Name,properties=json[index]["Properties"],aggGeom=body.AggGeom,formats});
     }
     if(obj is UStaticMesh mesh){
      var lod=mesh.RenderData?.LODs?.FirstOrDefault();
      meshes.Add(new{index,name=obj.Name,mesh.BodySetup,positions=lod?.PositionVertexBuffer?.Verts.Select(v=>new[]{v.X,v.Y,v.Z}),indices=lod?.IndexBuffer?.Buffer,sections=lod?.Sections});
     }
     if(obj is URecastNavMeshDataChunk chunk){
      tiles.Add(new{index,name=obj.Name,version=chunk.NavMeshVersion,tiles=chunk.Tiles.Select(t=>t.Tile is null?null:new{header=t.Tile.Header,vertices=t.Tile.Vertices.Select(v=>new[]{v.X,v.Y,v.Z}),polygons=t.Tile.Polys,detailMeshes=t.Tile.DetailMeshes,detailVertices=t.Tile.DetailVertices.Select(v=>new[]{v.X,v.Y,v.Z}),detailTriangles=t.Tile.DetailTris})});
     }
    }
        if(followScene){
     string? FindPackage(string reference){
      var path=reference.Split('.')[0];
      if(path.StartsWith("/Game/"))path="ShooterGame/Content/"+path[6..];
      else if(path.StartsWith("/Engine/"))path="Engine/Content/"+path[8..];
      else return null;
      foreach(var extension in new[]{".umap",".uasset"})if(provider.Files.TryGetValue(path+extension,out var f))return f.Path;
      return null;
     }
     void Add(string? reference){if(reference is not null&&FindPackage(reference) is string path)queue.Enqueue(path);}
     foreach(var obj in json.OfType<JObject>()){
      if(obj["Properties"]?["WorldAsset"]?["AssetPathName"]?.Value<string>() is string level)Add(level);
      if(obj["Type"]?.Value<string>()=="AresWorldSettings"){
       foreach(var mode in obj["Properties"]?["GameModeSpecificSublevelsByKey"]?.Children()??[]){
        if(mode["SublevelKey"]?.Value<string>()!="EGameModeSublevelKey::BombMode")continue;
        foreach(var levelRef in mode["Sublevels"]?.Children()??[])Add(levelRef["AssetPathName"]?.Value<string>());
       }
      }
      Add(obj["Template"]?["ObjectPath"]?.Value<string>());
      Add(obj["SuperStruct"]?["ObjectPath"]?.Value<string>());
      var classText=obj["Class"]?.Value<string>();
      if(classText?.StartsWith("BlueprintGeneratedClass'")==true)Add(classText.Split('\'')[1]);
      foreach(var reference in obj.Descendants().OfType<JObject>().Where(x=>x["ObjectPath"]!=null&&x["ObjectName"]!=null)){
       var name=reference["ObjectName"]!.Value<string>()!;
       if(name.StartsWith("StaticMesh'")||name.StartsWith("BlueprintGeneratedClass'"))Add(reference["ObjectPath"]?.Value<string>());
      }
     }
    }
    var instances=json.OfType<JObject>().Select((o,i)=>new{index=i,obj=o}).Where(x=>x.obj["Type"]?.ToString().Contains("Component")==true||x.obj["Type"]?.ToString().Contains("Streaming")==true||x.obj["Type"]?.ToString()=="AresWorldSettings"||x.obj["Properties"]?["RootComponent"]!=null).ToArray();
    await File.WriteAllTextAsync(destination,JsonConvert.SerializeObject(new{sourceBuild,manifest=manifestId,asset,units="Unreal centimeters except raw Recast tile coordinate frame, which is not normalized here",completeTerrain=false,defaultObjects=asset.EndsWith(".umap")||meshes.Count>0?null:json,instances,shapes,meshes,tiles},Formatting.None));
    reports.Add(new{asset,ok=true,exports=exports.Length,instances=instances.Length,shapes=shapes.Count,meshes=meshes.Count,navChunks=tiles.Count,destination});
    if(!followScene||reports.Count%50==0)Console.WriteLine($"Terrain probe {reports.Count} assets, queued {queue.Count}; latest {asset}");
   }catch(Exception ex){reports.Add(new{asset,ok=false,error=ex.ToString()});Console.WriteLine($"Terrain probe failed {asset}: {ex.Message}");}
  }
  await File.WriteAllTextAsync(Path.Combine(root,followScene?"terrain-scene-report.json":"terrain-probe-report.json"),JsonConvert.SerializeObject(reports,Formatting.Indented));
 }
}
