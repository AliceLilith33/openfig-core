/**
 * The REST view of a file's variables: what `GET /v1/files/:key/variables/local`
 * returns, built from the VARIABLE and VARIABLE_SET nodes of the .fig.
 */
import type * as Rest from "@figma/rest-api-spec";
import type { FigDocument, FigNode } from "../types.js";
import { comparePosition, nodeId } from "../utils.js";
import { variableModes, variableSetOf } from "../variables.js";
import { color, guidString, variableAlias } from "./paint.js";

export type RestVariables = Rest.GetLocalVariablesResponse;

/** kiwi scopes that REST names differently or does not have. */
const SCOPES: Record<string, Rest.VariableScope | null> = {
  STROKE: "STROKE_COLOR",
  TRANSFORM: null,
  COLOR_OPACITY: null,
};

const PLATFORMS: Record<string, keyof Rest.VariableCodeSyntax> = { WEB: "WEB", ANDROID: "ANDROID", iOS: "iOS", IOS: "iOS" };

function isRemote(n: any): boolean {
  return !!n.sourceLibraryKey;
}

/**
 * The REST id of a variable node. A library variable copied into the file is
 * referenced by key and version, as consumers' `boundVariables` name it.
 */
export function restVariableId(n: FigNode): string {
  const any = n as any;
  return isRemote(any) && any.key ? `VariableID:${any.key}/${any.version ?? ""}` : `VariableID:${nodeId(n)}`;
}

/** The REST id of a VARIABLE_SET node: `VariableCollectionId:s:l`, or by key for a library one. */
export function restCollectionId(n: FigNode): string {
  const any = n as any;
  return isRemote(any) && any.key ? `VariableCollectionId:${any.key}/${any.version ?? ""}` : `VariableCollectionId:${nodeId(n)}`;
}

/** The REST collection id a `variableSetID` reference names, when the set is not in the file. */
export function collectionIdOfRef(ref: any): string | undefined {
  if (ref?.guid) return `VariableCollectionId:${guidString(ref.guid)}`;
  if (ref?.assetRef?.key) return `VariableCollectionId:${ref.assetRef.key}/${ref.assetRef.version ?? ""}`;
  return undefined;
}

function value(data: any): Rest.LocalVariable["valuesByMode"][string] | undefined {
  if (!data) return undefined;
  const alias = variableAlias(data);
  if (alias) return alias;
  const v = data.value ?? {};
  switch (data.resolvedDataType ?? data.dataType) {
    case "COLOR": return color(v.colorValue);
    case "FLOAT": return v.floatValue ?? 0;
    case "STRING": return v.textValue ?? "";
    case "BOOLEAN": return v.boolValue ?? false;
  }
  return undefined;
}

function scopes(list: string[] | undefined): Rest.VariableScope[] {
  if (!list?.length) return ["ALL_SCOPES"];
  const out: Rest.VariableScope[] = [];
  for (const s of list) {
    const mapped = s in SCOPES ? SCOPES[s] : (s as Rest.VariableScope);
    if (mapped && !out.includes(mapped)) out.push(mapped);
  }
  return out;
}

function codeSyntax(map: any): Rest.VariableCodeSyntax {
  const out: Rest.VariableCodeSyntax = {};
  for (const e of map?.entries ?? []) {
    const platform = PLATFORMS[e?.platform];
    if (platform && e.value) out[platform] = e.value;
  }
  return out;
}

/**
 * Convert the variables of a parsed file to the REST API's local variables
 * response. Library variables and collections copied into the file are
 * included with `remote: true`, as REST includes the ones the file uses.
 */
export function toRestVariables(doc: FigDocument): RestVariables {
  const variables: Record<string, Rest.LocalVariable> = {};
  const variableCollections: Record<string, Rest.LocalVariableCollection> = {};
  const live = (n: FigNode) => n.phase !== "REMOVED";

  const sets = doc.nodes.filter((n) => n.type === "VARIABLE_SET" && live(n));
  for (const set of sets) {
    const any = set as any;
    const modes = variableModes(set);
    const id = restCollectionId(set);
    variableCollections[id] = {
      id,
      name: set.name ?? "",
      key: any.key ?? "",
      modes: modes.map((m) => ({ modeId: guidString(m.id), name: m.name ?? "" })),
      defaultModeId: modes[0] ? guidString(modes[0].id) : "",
      remote: isRemote(any),
      hiddenFromPublishing: !isRemote(any) && any.isPublishable === false,
      variableIds: [],
    };
  }

  const vars = doc.nodes.filter((n) => n.type === "VARIABLE" && live(n));
  vars.sort((a, b) => comparePosition((a as any).sortPosition, (b as any).sortPosition));
  for (const v of vars) {
    const any = v as any;
    const set = variableSetOf(doc, v);
    const collectionId = set ? restCollectionId(set) : collectionIdOfRef(any.variableSetID) ?? "";
    const valuesByMode: Rest.LocalVariable["valuesByMode"] = {};
    for (const e of any.variableDataValues?.entries ?? []) {
      const val = value(e?.variableData);
      if (e?.modeID && val !== undefined) valuesByMode[guidString(e.modeID)] = val;
    }
    const id = restVariableId(v);
    const out: Rest.LocalVariable = {
      id,
      name: v.name ?? "",
      key: any.key ?? "",
      variableCollectionId: collectionId,
      resolvedType: any.variableResolvedType ?? "FLOAT",
      valuesByMode,
      remote: isRemote(any),
      description: any.description ?? any.symbolDescription ?? "",
      hiddenFromPublishing: !isRemote(any) && any.isPublishable === false,
      scopes: scopes(any.variableScopes),
      codeSyntax: codeSyntax(any.codeSyntax),
    };
    if (any.isSoftDeleted) out.deletedButReferenced = true;
    variables[id] = out;
    variableCollections[collectionId]?.variableIds.push(id);
  }
  return { status: 200, error: false, meta: { variables, variableCollections } };
}
