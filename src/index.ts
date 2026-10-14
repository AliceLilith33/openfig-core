export { parseFig, parseFigBinary } from "./parser.js";
export { encodeFigParts, assembleCanvasFig, createFigZip } from "./encoder.js";
export { convertDeckToFig } from "./convert.js";
export { createEmptyFigDoc } from "./template.js";
export { nodeId, comparePosition, sortByPosition, positionAt, liveChildren } from "./utils.js";
export {
  IDENTITY_TRANSFORM,
  parentOf,
  ancestors,
  pageOf,
  walk,
  findAll,
  multiplyTransform,
  applyTransform,
  getAbsoluteTransform,
  getAbsoluteBoundingBox,
} from "./tree.js";
export { resolveTree, resolveInstance, walkResolved, overrideKeyOf } from "./instance.js";
export {
  findVariable,
  findVariableSet,
  variableSetOf,
  variableModes,
  explicitModes,
  resolveVariable,
  resolveVariableData,
  resolvePaint,
  resolvePaintColor,
  resolveBoundVariables,
} from "./variables.js";
export { extractRenderableGradientFill, resolveGradientGeometry } from "./gradient.js";
export { toRestDocument } from "./rest/index.js";
export { toRestVariables } from "./rest/variables.js";
export { toDesignIR, designFromFig, nodeSvg, screenIR } from "./ir/index.js";
export {
  appendVectorPayloadToDocument,
  encodeCommandsBlob,
  encodeVectorNetwork,
  encodeVectorNetworkBlob,
  geometryBlobToSVGPath,
  getBlobBytes,
  parseCommandsBlob,
  parseSVGPathData,
  parseVectorNetworkBlob,
  resolveVectorNodePaths,
} from "./vector.js";
export { hexToFigColor, parseCssRgbColor, cssColorToFigColor, makeSolidPaint } from "./color.js";
export { serializeSvgPathData, transformSvgPathData, mapStrokeJoin, mapStrokeCap } from "./svgPath.js";
export type { FigDocument, FigNode, FigPaint, FigGuid, FigColor, FigTransform, FigGradientStop } from "./types.js";
export type * as Kiwi from "./kiwi.js";
export type { EncodedFigParts, AssembleCanvasFigInput, CreateFigZipInput } from "./encoder.js";
export type { ConvertOptions } from "./convert.js";
export type { WalkOptions, WalkVisitor, FigRect } from "./tree.js";
export type { ResolvedNode, ResolveOptions } from "./instance.js";
export type { RestFile, TextLine, ToRestOptions } from "./rest/index.js";
export type { RestVariables } from "./rest/variables.js";
export type * from "./ir/types.js";
export type { ToDesignIROptions } from "./ir/index.js";
export type { FigVariableRef, ResolveVariableOptions, ResolvedPaint, ResolvedVariableValue } from "./variables.js";
export type {
  GradientFillLike,
  GradientKind,
  GradientPoint,
  RenderableGradientFill,
  ResolvedGradientGeometry,
  ResolvedLinearGradientGeometry,
  ResolvedRadialGradientGeometry,
} from "./gradient.js";
export type {
  AppendVectorPayloadInput,
  AuthoredVectorPayload,
  GeometryBlobToSVGPathOptions,
  ParseCommandsBlobOptions,
  ResolvedGeometryPath,
  ResolvedVectorNodePaths,
  VectorGeometryInput,
  VectorNetwork,
  VectorNetworkInput,
  VectorNetworkRegion,
  VectorNetworkSegment,
  VectorNetworkVertex,
  VectorPathCommand,
  VectorStyleOverride,
} from "./vector.js";
