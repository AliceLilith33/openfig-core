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
export { extractRenderableGradientFill, resolveGradientGeometry } from "./gradient.js";
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
export type { EncodedFigParts, AssembleCanvasFigInput, CreateFigZipInput } from "./encoder.js";
export type { ConvertOptions } from "./convert.js";
export type { WalkOptions, WalkVisitor, FigRect } from "./tree.js";
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
