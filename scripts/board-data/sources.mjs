import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

export async function loadGameSources(root) {
  const files = await readdir(root, { recursive: true });
  const packages = new Map();
  for (const file of files.filter((name) => name.endsWith(".uasset.json"))) {
    const absolute = path.join(root, file);
    const bytes = await readFile(absolute);
    const exports = JSON.parse(bytes);
    const packagePath = file
      .replaceAll("\\", "/")
      .replace(/\.uasset\.json$/, "")
      .replace(/^ShooterGame\/Content\//, "/Game/");
    const entry = {
      packagePath,
      exports,
      hash: createHash("sha256").update(bytes).digest("hex"),
    };
    packages.set(packagePath, entry);
  }
  const byName = new Map(),
    ambiguousNames = new Set();
  for (const entry of packages.values()) {
    const name = entry.packagePath.split("/").at(-1);
    if (byName.has(name)) {
      byName.delete(name);
      ambiguousNames.add(name);
    } else if (!ambiguousNames.has(name)) byName.set(name, entry);
  }
  function referenced(reference) {
    if (!reference?.ObjectPath?.startsWith("/Game/")) return null;
    const packagePath = reference.ObjectPath.replace(/\.\d+$/, "");
    const entry = packages.get(packagePath);
    if (!entry) return null;
    const name = reference.ObjectName?.match(/'([^']+)'$/)?.[1]
      ?.split(":")
      .at(-1)
      ?.split(".")
      .at(-1);
    const object = entry.exports.find((item) => item.Name === name);
    return object ? { entry, object } : null;
  }
  function own(entry, component, seen = new Set()) {
    if (seen.has(entry.packagePath)) return null;
    seen.add(entry.packagePath);
    const object =
      component === "self"
        ? entry.exports.find((item) => item.Name.startsWith("Default__"))
        : entry.exports.find(
            (item) =>
              item.Name === component ||
              item.Name === `${component}_GEN_VARIABLE`,
          );
    if (object) return { entry, object };
    const cls = entry.exports.find(
      (item) =>
        item.Type === "BlueprintGeneratedClass" &&
        item.Name === `${entry.packagePath.split("/").at(-1)}_C`,
    );
    const parent = referenced(cls?.Super);
    return parent ? own(parent.entry, component, seen) : null;
  }
  function lookup(entry, object, property, seen = new Set()) {
    const key = `${entry.packagePath}:${object.Name}.${property}`;
    if (seen.has(key)) return null;
    seen.add(key);
    // Exact property first. Struct members can be selected explicitly with a dot.
    let value = object.Properties;
    for (const part of property.split(".")) value = value?.[part];
    if (value !== undefined) return { value, entry, object, property };
    const template = referenced(object.Template);
    if (template) {
      const found = lookup(template.entry, template.object, property, seen);
      if (found) return found;
    }
    const cls = entry.exports.find(
      (item) =>
        item.Type === "BlueprintGeneratedClass" && item.Name === object.Type,
    );
    const parent = referenced(cls?.Super);
    if (parent) {
      const defaultObject = parent.entry.exports.find((item) =>
        item.Name.startsWith("Default__"),
      );
      if (defaultObject)
        return lookup(parent.entry, defaultObject, property, seen);
    }
    return null;
  }
  return {
    packages,
    byName,
    read(packageName, component, property) {
      if (ambiguousNames.has(packageName))
        throw new Error(`Ambiguous package ${packageName}; use its full path.`);
      const entry = byName.get(packageName) ?? packages.get(packageName);
      if (!entry) throw new Error(`Missing package ${packageName}`);
      const selected = own(entry, component);
      if (!selected)
        throw new Error(`Missing component ${entry.packagePath}:${component}`);
      const result = lookup(selected.entry, selected.object, property);
      if (!result)
        throw new Error(
          `Missing effective property ${packageName}:${component}.${property}`,
        );
      return result;
    },
  };
}

export function metric(
  sources,
  build,
  packageName,
  component,
  property,
  unit = "m",
  factor = unit === "m" ? 0.01 : 1,
) {
  const source = sources.read(packageName, component, property);
  if (typeof source.value !== "number" || !Number.isFinite(source.value))
    throw new Error(`Non-numeric geometry property ${packageName}.${property}`);
  return {
    value: source.value * factor,
    unit,
    package: source.entry.packagePath,
    component: source.object.Name,
    property,
    sourceBuild: build,
    source: `riot-manifest:${build}`,
    rawValue: source.value,
    conversion: factor,
    sourceHash: source.entry.hash,
  };
}
