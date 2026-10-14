/**
 * Types for the decoded .fig wire format, one per kiwi schema definition.
 *
 * GENERATED from src/utilities/figKiwiSchema.ts — do not edit. Regenerate with:
 *   npx tsx src/utilities/generateKiwiTypes.ts > src/kiwi.ts
 *
 * ENUMs are string unions (kiwi decodes them to names). MESSAGE fields are all
 * optional: a field is present only if the file wrote it. byte[] is a
 * Uint8Array; int64 and uint64 are bigint.
 *
 * A file's embedded schema can be newer than this one, so a decoded node can
 * carry fields not listed here.
 */

export type MessageType =
  | "JOIN_START"
  | "NODE_CHANGES"
  | "USER_CHANGES"
  | "JOIN_END"
  | "SIGNAL"
  | "STYLE"
  | "STYLE_SET"
  | "JOIN_START_SKIP_RELOAD"
  | "NOTIFY_SHOULD_UPGRADE"
  | "UPGRADE_DONE"
  | "UPGRADE_REFRESH"
  | "SCENE_GRAPH_QUERY"
  | "SCENE_GRAPH_REPLY"
  | "DIFF"
  | "CLIENT_BROADCAST"
  | "JOIN_START_JOURNALED"
  | "STREAM_START"
  | "STREAM_END"
  | "INTERACTIVE_SLIDE_CHANGE"
  | "RECONNECT_SCENE_GRAPH_QUERY"
  | "RECONNECT_SCENE_GRAPH_REPLY"
  | "JOIN_END_INCREMENTAL_RECONNECT"
  | "NODE_STATUS_CHANGE"
  | "CLIENT_RENDERED"
  | "BUZZ_APPROVAL_CHANGE";

export type Axis =
  | "X"
  | "Y";

export type Access =
  | "READ_ONLY"
  | "READ_WRITE";

export type NodePhase =
  | "CREATED"
  | "REMOVED";

export type WindingRule =
  | "NONZERO"
  | "ODD";

export type NodeType =
  | "NONE"
  | "DOCUMENT"
  | "CANVAS"
  | "GROUP"
  | "FRAME"
  | "BOOLEAN_OPERATION"
  | "VECTOR"
  | "STAR"
  | "LINE"
  | "ELLIPSE"
  | "RECTANGLE"
  | "REGULAR_POLYGON"
  | "ROUNDED_RECTANGLE"
  | "TEXT"
  | "SLICE"
  | "SYMBOL"
  | "INSTANCE"
  | "STICKY"
  | "SHAPE_WITH_TEXT"
  | "CONNECTOR"
  | "CODE_BLOCK"
  | "WIDGET"
  | "STAMP"
  | "MEDIA"
  | "HIGHLIGHT"
  | "SECTION"
  | "SECTION_OVERLAY"
  | "WASHI_TAPE"
  | "VARIABLE"
  | "TABLE"
  | "TABLE_CELL"
  | "VARIABLE_SET"
  | "SLIDE"
  | "ASSISTED_LAYOUT"
  | "INTERACTIVE_SLIDE_ELEMENT"
  | "VARIABLE_OVERRIDE"
  | "MODULE"
  | "SLIDE_GRID"
  | "SLIDE_ROW"
  | "RESPONSIVE_SET"
  | "CODE_COMPONENT"
  | "TEXT_PATH"
  | "CODE_INSTANCE"
  | "CODE_LIBRARY"
  | "CODE_FILE"
  | "CODE_LAYER"
  | "BRUSH"
  | "MANAGED_STRING"
  | "TRANSFORM"
  | "CMS_RICH_TEXT"
  | "REPEATER"
  | "JSX"
  | "EMBEDDED_PROTOTYPE"
  | "REACT_FIBER"
  | "RESPONSIVE_NODE_SET"
  | "WEBPAGE"
  | "KEYFRAME"
  | "KEYFRAME_TRACK"
  | "ANIMATION_PRESET_INSTANCE"
  | "CODE_EMBED"
  | "BINARY_FILE"
  | "SPEC_BLOCK"
  | "TOOL_INSTANCE"
  | "CUSTOM_EFFECT_INSTANCE"
  | "NATIVE_CODE_LAYER_INSTANCE";

export type ShapeWithTextType =
  | "SQUARE"
  | "ELLIPSE"
  | "DIAMOND"
  | "TRIANGLE_UP"
  | "TRIANGLE_DOWN"
  | "ROUNDED_RECTANGLE"
  | "PARALLELOGRAM_RIGHT"
  | "PARALLELOGRAM_LEFT"
  | "ENG_DATABASE"
  | "ENG_QUEUE"
  | "ENG_FILE"
  | "ENG_FOLDER"
  | "TRAPEZOID"
  | "PREDEFINED_PROCESS"
  | "SHIELD"
  | "DOCUMENT_SINGLE"
  | "DOCUMENT_MULTIPLE"
  | "MANUAL_INPUT"
  | "HEXAGON"
  | "CHEVRON"
  | "PENTAGON"
  | "OCTAGON"
  | "STAR"
  | "PLUS"
  | "ARROW_LEFT"
  | "ARROW_RIGHT"
  | "SUMMING_JUNCTION"
  | "OR"
  | "SPEECH_BUBBLE"
  | "INTERNAL_STORAGE";

export type BlendMode =
  | "PASS_THROUGH"
  | "NORMAL"
  | "DARKEN"
  | "MULTIPLY"
  | "LINEAR_BURN"
  | "COLOR_BURN"
  | "LIGHTEN"
  | "SCREEN"
  | "LINEAR_DODGE"
  | "COLOR_DODGE"
  | "OVERLAY"
  | "SOFT_LIGHT"
  | "HARD_LIGHT"
  | "DIFFERENCE"
  | "EXCLUSION"
  | "HUE"
  | "SATURATION"
  | "COLOR"
  | "LUMINOSITY";

export type PaintType =
  | "SOLID"
  | "GRADIENT_LINEAR"
  | "GRADIENT_RADIAL"
  | "GRADIENT_ANGULAR"
  | "GRADIENT_DIAMOND"
  | "IMAGE"
  | "EMOJI"
  | "VIDEO"
  | "PATTERN"
  | "NOISE"
  | "CUSTOM";

export type ImageScaleMode =
  | "STRETCH"
  | "FIT"
  | "FILL"
  | "TILE";

export type EffectType =
  | "INNER_SHADOW"
  | "DROP_SHADOW"
  | "FOREGROUND_BLUR"
  | "BACKGROUND_BLUR"
  | "REPEAT"
  | "SYMMETRY"
  | "GRAIN"
  | "NOISE"
  | "GLASS"
  | "CUSTOM";

export type TextCase =
  | "ORIGINAL"
  | "UPPER"
  | "LOWER"
  | "TITLE"
  | "SMALL_CAPS"
  | "SMALL_CAPS_FORCED";

export type TextDecoration =
  | "NONE"
  | "UNDERLINE"
  | "STRIKETHROUGH";

export type TextDecorationStyle =
  | "SOLID"
  | "DOTTED"
  | "WAVY";

export type LeadingTrim =
  | "NONE"
  | "CAP_HEIGHT";

export type NumberUnits =
  | "RAW"
  | "PIXELS"
  | "PERCENT";

export type ConstraintType =
  | "MIN"
  | "CENTER"
  | "MAX"
  | "STRETCH"
  | "SCALE"
  | "FIXED_MIN"
  | "FIXED_MAX";

export type StrokeAlign =
  | "CENTER"
  | "INSIDE"
  | "OUTSIDE"
  | "OFFSET";

export type StrokeCap =
  | "NONE"
  | "ROUND"
  | "SQUARE"
  | "ARROW_LINES"
  | "ARROW_EQUILATERAL"
  | "DIAMOND_FILLED"
  | "TRIANGLE_FILLED"
  | "HIGHLIGHT"
  | "WASHI_TAPE_1"
  | "WASHI_TAPE_2"
  | "WASHI_TAPE_3"
  | "WASHI_TAPE_4"
  | "WASHI_TAPE_5"
  | "WASHI_TAPE_6"
  | "CIRCLE_FILLED"
  | "ERD_ZERO_OR_ONE"
  | "ERD_EXACTLY_ONE"
  | "ERD_ZERO_OR_MORE"
  | "ERD_ONE_OR_MORE"
  | "ERD_ONE"
  | "ERD_MANY";

export type StrokeJoin =
  | "MITER"
  | "BEVEL"
  | "ROUND";

export type BooleanOperation =
  | "UNION"
  | "INTERSECT"
  | "SUBTRACT"
  | "XOR";

export type TextAlignHorizontal =
  | "LEFT"
  | "CENTER"
  | "RIGHT"
  | "JUSTIFIED";

export type TextAlignVertical =
  | "TOP"
  | "CENTER"
  | "BOTTOM";

export type MouseCursor =
  | "DEFAULT"
  | "CROSSHAIR"
  | "EYEDROPPER"
  | "HAND"
  | "PAINT_BUCKET"
  | "PEN"
  | "PENCIL"
  | "MARKER"
  | "ERASER"
  | "HIGHLIGHTER"
  | "LASSO";

export type VectorMirror =
  | "NONE"
  | "ANGLE"
  | "ANGLE_AND_LENGTH";

export type DashMode =
  | "CLIP"
  | "STRETCH";

export type ImageType =
  | "PNG"
  | "JPEG"
  | "SVG"
  | "PDF"
  | "MP4"
  | "GIF"
  | "WEBM"
  | "LOTTIE"
  | "DOTLOTTIE";

export type ExportConstraintType =
  | "CONTENT_SCALE"
  | "CONTENT_WIDTH"
  | "CONTENT_HEIGHT";

export type LayoutGridType =
  | "MIN"
  | "CENTER"
  | "STRETCH"
  | "MAX";

export type LayoutGridPattern =
  | "STRIPES"
  | "GRID";

export type TextAutoResize =
  | "NONE"
  | "WIDTH_AND_HEIGHT"
  | "HEIGHT";

export type TextTruncation =
  | "DISABLED"
  | "ENDING";

export type TextWrapStyle =
  | "AUTO"
  | "BALANCE"
  | "PRETTY";

export type StyleSetType =
  | "PERSONAL"
  | "TEAM"
  | "CUSTOM"
  | "FREQUENCY"
  | "TEMPORARY";

export type StyleSetContentType =
  | "SOLID"
  | "GRADIENT"
  | "IMAGE";

export type StackMode =
  | "NONE"
  | "HORIZONTAL"
  | "VERTICAL"
  | "GRID";

export type StackAlign =
  | "MIN"
  | "CENTER"
  | "MAX"
  | "BASELINE";

export type StackCounterAlign =
  | "MIN"
  | "CENTER"
  | "MAX"
  | "STRETCH"
  | "AUTO"
  | "BASELINE";

export type StackJustify =
  | "MIN"
  | "CENTER"
  | "MAX"
  | "SPACE_EVENLY"
  | "SPACE_BETWEEN"
  | "SPACE_AROUND"
  | "SPACE_EVENLY_CSS";

export type GridChildAlign =
  | "AUTO"
  | "MIN"
  | "CENTER"
  | "MAX";

export type GridAutoTracks =
  | "NONE"
  | "ROWS";

export type StackSize =
  | "FIXED"
  | "RESIZE_TO_FIT"
  | "RESIZE_TO_FIT_WITH_IMPLICIT_SIZE";

export type StackPositioning =
  | "AUTO"
  | "ABSOLUTE";

export type StackWrap =
  | "NO_WRAP"
  | "WRAP";

export type StackCounterAlignContent =
  | "AUTO"
  | "SPACE_BETWEEN";

export type ConnectionType =
  | "NONE"
  | "INTERNAL_NODE"
  | "URL"
  | "BACK"
  | "CLOSE"
  | "SET_VARIABLE"
  | "UPDATE_MEDIA_RUNTIME"
  | "CONDITIONAL"
  | "SET_VARIABLE_MODE"
  | "OBJECT_ANIMATION"
  | "UPDATE_ANIMATION_TIMELINE_STATE";

export type InteractionType =
  | "ON_CLICK"
  | "AFTER_TIMEOUT"
  | "MOUSE_IN"
  | "MOUSE_OUT"
  | "ON_HOVER"
  | "MOUSE_DOWN"
  | "MOUSE_UP"
  | "ON_PRESS"
  | "NONE"
  | "DRAG"
  | "ON_KEY_DOWN"
  | "ON_VOICE"
  | "ON_MEDIA_HIT"
  | "ON_MEDIA_END"
  | "MOUSE_ENTER"
  | "MOUSE_LEAVE";

export type TransitionType =
  | "INSTANT_TRANSITION"
  | "DISSOLVE"
  | "FADE"
  | "SLIDE_FROM_LEFT"
  | "SLIDE_FROM_RIGHT"
  | "SLIDE_FROM_TOP"
  | "SLIDE_FROM_BOTTOM"
  | "PUSH_FROM_LEFT"
  | "PUSH_FROM_RIGHT"
  | "PUSH_FROM_TOP"
  | "PUSH_FROM_BOTTOM"
  | "MOVE_FROM_LEFT"
  | "MOVE_FROM_RIGHT"
  | "MOVE_FROM_TOP"
  | "MOVE_FROM_BOTTOM"
  | "SLIDE_OUT_TO_LEFT"
  | "SLIDE_OUT_TO_RIGHT"
  | "SLIDE_OUT_TO_TOP"
  | "SLIDE_OUT_TO_BOTTOM"
  | "MOVE_OUT_TO_LEFT"
  | "MOVE_OUT_TO_RIGHT"
  | "MOVE_OUT_TO_TOP"
  | "MOVE_OUT_TO_BOTTOM"
  | "MAGIC_MOVE"
  | "SMART_ANIMATE"
  | "SCROLL_ANIMATE";

export type EasingType =
  | "IN_CUBIC"
  | "OUT_CUBIC"
  | "INOUT_CUBIC"
  | "LINEAR"
  | "IN_BACK_CUBIC"
  | "OUT_BACK_CUBIC"
  | "INOUT_BACK_CUBIC"
  | "CUSTOM_CUBIC"
  | "SPRING"
  | "GENTLE_SPRING"
  | "CUSTOM_SPRING"
  | "SPRING_PRESET_ONE"
  | "SPRING_PRESET_TWO"
  | "SPRING_PRESET_THREE"
  | "HOLD"
  | "EASE_IN";

export type ScrollDirection =
  | "NONE"
  | "HORIZONTAL"
  | "VERTICAL"
  | "BOTH";

export type ScrollContractedState =
  | "EXPANDED"
  | "CONTRACTED";

export interface GUID {
  sessionID: number;
  localID: number;
}

export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface Vector {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ColorStop {
  color: Color;
  position: number;
}

export interface ColorStopVar {
  color?: Color;
  colorVar?: VariableData;
  position?: number;
}

export type ColorSpace =
  | "DEFAULT"
  | "SRGB"
  | "DISPLAY_P3"
  | "HSL"
  | "HSB"
  | "OKLAB"
  | "OKLCH";

export interface AuthoredColor {
  space?: ColorSpace;
  c0?: number;
  c1?: number;
  c2?: number;
  c3?: number;
}

export interface AuthoredColorStop {
  authoredColor?: AuthoredColor;
  position?: number;
}

export interface Matrix {
  m00: number;
  m01: number;
  m02: number;
  m10: number;
  m11: number;
  m12: number;
}

export interface ParentIndex {
  guid: GUID;
  position: string;
}

export interface Number {
  value: number;
  units: NumberUnits;
}

export interface FontName {
  family: string;
  style: string;
  postscript: string;
}

export type FontVariantNumericFigure =
  | "NORMAL"
  | "LINING"
  | "OLDSTYLE";

export type FontVariantNumericSpacing =
  | "NORMAL"
  | "PROPORTIONAL"
  | "TABULAR";

export type FontVariantNumericFraction =
  | "NORMAL"
  | "DIAGONAL"
  | "STACKED";

export type FontVariantCaps =
  | "NORMAL"
  | "SMALL"
  | "ALL_SMALL"
  | "PETITE"
  | "ALL_PETITE"
  | "UNICASE"
  | "TITLING";

export type FontVariantPosition =
  | "NORMAL"
  | "SUB"
  | "SUPER";

export type FontStyle =
  | "NORMAL"
  | "ITALIC";

export type SemanticWeight =
  | "NORMAL"
  | "BOLD";

export type SemanticItalic =
  | "NORMAL"
  | "ITALIC";

export type CodeSnapshotState =
  | "INITIAL"
  | "SNAPSHOTTING"
  | "OK"
  | "SNAPSHOT_ERROR"
  | "LLM_IN_PROGRESS";

export type CachedPreviewStatus =
  | "UNKNOWN"
  | "PENDING"
  | "COMPLETE"
  | "FAILED"
  | "ERROR";

export type SnapshotCaptureMode =
  | "FULL"
  | "PARTIAL";

export interface CodeSourceInfo {
  originReferenceId?: string;
  originNodeId?: GUID;
  linkedSnapshotId?: GUID;
  captureMode?: SnapshotCaptureMode;
  sourceBlobRef?: string;
  sourceElementId?: string;
}

export type CodeObjectType =
  | "WEB_LAYER"
  | "WEB_INTERACTION"
  | "NATIVE_LAYER"
  | "ANIMATION_PRESET"
  | "TOOL"
  | "CUSTOM_EFFECT"
  | "PLUGIN"
  | "WEB_LAYER_GENERIC"
  | "CUSTOM_FILL";

export interface CustomToolArtifactRef {
  customToolId?: string;
  customToolVersion?: string;
  publishedCustomToolId?: string;
  publishedCustomToolVersionId?: string;
}

export type LockMode =
  | "NONE"
  | "ALL"
  | "BACKGROUND_ONLY";

export type OpenTypeFeature =
  | "PCAP"
  | "C2PC"
  | "CASE"
  | "CPSP"
  | "TITL"
  | "UNIC"
  | "ZERO"
  | "SINF"
  | "ORDN"
  | "AFRC"
  | "DNOM"
  | "NUMR"
  | "LIGA"
  | "CLIG"
  | "DLIG"
  | "HLIG"
  | "RLIG"
  | "AALT"
  | "CALT"
  | "RCLT"
  | "SALT"
  | "RVRN"
  | "VERT"
  | "SWSH"
  | "CSWH"
  | "NALT"
  | "CCMP"
  | "STCH"
  | "HIST"
  | "SIZE"
  | "ORNM"
  | "ITAL"
  | "RAND"
  | "DTLS"
  | "FLAC"
  | "MGRK"
  | "SSTY"
  | "KERN"
  | "FWID"
  | "HWID"
  | "HALT"
  | "TWID"
  | "QWID"
  | "PWID"
  | "JUST"
  | "LFBD"
  | "OPBD"
  | "RTBD"
  | "PALT"
  | "PKNA"
  | "LTRA"
  | "LTRM"
  | "RTLA"
  | "RTLM"
  | "ABRV"
  | "ABVM"
  | "ABVS"
  | "VALT"
  | "VHAL"
  | "BLWF"
  | "BLWM"
  | "BLWS"
  | "AKHN"
  | "CJCT"
  | "CFAR"
  | "CPCT"
  | "CURS"
  | "DIST"
  | "EXPT"
  | "FALT"
  | "FINA"
  | "FIN2"
  | "FIN3"
  | "HALF"
  | "HALN"
  | "HKNA"
  | "HNGL"
  | "HOJO"
  | "INIT"
  | "ISOL"
  | "JP78"
  | "JP83"
  | "JP90"
  | "JP04"
  | "LJMO"
  | "LOCL"
  | "MARK"
  | "MEDI"
  | "MED2"
  | "MKMK"
  | "NLCK"
  | "NUKT"
  | "PREF"
  | "PRES"
  | "VPAL"
  | "PSTF"
  | "PSTS"
  | "RKRF"
  | "RPHF"
  | "RUBY"
  | "SMPL"
  | "TJMO"
  | "TNAM"
  | "TRAD"
  | "VATU"
  | "VJMO"
  | "VKNA"
  | "VKRN"
  | "VRTR"
  | "VRT2"
  | "SS01"
  | "SS02"
  | "SS03"
  | "SS04"
  | "SS05"
  | "SS06"
  | "SS07"
  | "SS08"
  | "SS09"
  | "SS10"
  | "SS11"
  | "SS12"
  | "SS13"
  | "SS14"
  | "SS15"
  | "SS16"
  | "SS17"
  | "SS18"
  | "SS19"
  | "SS20"
  | "CV01"
  | "CV02"
  | "CV03"
  | "CV04"
  | "CV05"
  | "CV06"
  | "CV07"
  | "CV08"
  | "CV09"
  | "CV10"
  | "CV11"
  | "CV12"
  | "CV13"
  | "CV14"
  | "CV15"
  | "CV16"
  | "CV17"
  | "CV18"
  | "CV19"
  | "CV20"
  | "CV21"
  | "CV22"
  | "CV23"
  | "CV24"
  | "CV25"
  | "CV26"
  | "CV27"
  | "CV28"
  | "CV29"
  | "CV30"
  | "CV31"
  | "CV32"
  | "CV33"
  | "CV34"
  | "CV35"
  | "CV36"
  | "CV37"
  | "CV38"
  | "CV39"
  | "CV40"
  | "CV41"
  | "CV42"
  | "CV43"
  | "CV44"
  | "CV45"
  | "CV46"
  | "CV47"
  | "CV48"
  | "CV49"
  | "CV50"
  | "CV51"
  | "CV52"
  | "CV53"
  | "CV54"
  | "CV55"
  | "CV56"
  | "CV57"
  | "CV58"
  | "CV59"
  | "CV60"
  | "CV61"
  | "CV62"
  | "CV63"
  | "CV64"
  | "CV65"
  | "CV66"
  | "CV67"
  | "CV68"
  | "CV69"
  | "CV70"
  | "CV71"
  | "CV72"
  | "CV73"
  | "CV74"
  | "CV75"
  | "CV76"
  | "CV77"
  | "CV78"
  | "CV79"
  | "CV80"
  | "CV81"
  | "CV82"
  | "CV83"
  | "CV84"
  | "CV85"
  | "CV86"
  | "CV87"
  | "CV88"
  | "CV89"
  | "CV90"
  | "CV91"
  | "CV92"
  | "CV93"
  | "CV94"
  | "CV95"
  | "CV96"
  | "CV97"
  | "CV98"
  | "CV99";

export interface ExportConstraint {
  type: ExportConstraintType;
  value: number;
}

export interface GUIDMapping {
  from: GUID;
  to: GUID;
}

export interface Blob {
  bytes: Uint8Array;
}

export interface Image {
  hash?: Uint8Array;
  name?: string;
  dataBlob?: number;
}

export interface Video {
  hash?: Uint8Array;
  s3Url?: string;
}

export interface PasteSource {
  srcFile?: string;
  srcNode?: GUID;
}

export interface WeaveConnection {
  workflowId?: string;
  nodeId?: string;
}

export interface WeaveLayerConnection {
  weaveVariableId?: string;
  paintId?: string;
}

export interface FilterColorAdjust {
  tint: number;
  shadows: number;
  highlights: number;
  detail: number;
  exposure: number;
  vignette: number;
  temperature: number;
  vibrance: number;
}

export interface PaintFilterMessage {
  tint?: number;
  shadows?: number;
  highlights?: number;
  detail?: number;
  exposure?: number;
  vignette?: number;
  temperature?: number;
  vibrance?: number;
  contrast?: number;
  brightness?: number;
}

export interface Paint {
  type?: PaintType;
  color?: Color;
  opacity?: number;
  visible?: boolean;
  blendMode?: BlendMode;
  stops?: ColorStop[];
  transform?: Matrix;
  image?: Image;
  imageThumbnail?: Image;
  animatedImage?: Image;
  animationFrame?: number;
  imageScaleMode?: ImageScaleMode;
  imageShouldColorManage?: boolean;
  rotation?: number;
  scale?: number;
  filterColorAdjust?: FilterColorAdjust;
  paintFilter?: PaintFilterMessage;
  emojiCodePoints?: number[];
  video?: Video;
  originalImageWidth?: number;
  originalImageHeight?: number;
  opacityVar?: VariableData;
  colorVar?: VariableData;
  imageVar?: VariableData;
  stopsVar?: ColorStopVar[];
  gradientVar?: VariableData;
  paintVar?: VariableData;
  thumbHashBase64?: string;
  thumbHash?: Uint8Array;
  sourceNodeId?: GUID;
  spacing?: number;
  patternSpacing?: Vector;
  patternTileType?: PatternTileType;
  verticalAlignment?: PatternAlignment;
  horizontalAlignment?: PatternAlignment;
  id?: GUID;
  altText?: string;
  noiseType?: NoiseType;
  density?: number;
  noiseSize?: Vector;
  customEffectId?: CodeComponentId;
  componentPropAssignments?: ComponentPropAssignment[];
  interpolationColorSpace?: InterpolationColorSpace;
  interpolationHueMethod?: InterpolationHueMethod;
  authoredColor?: AuthoredColor;
  authoredStops?: AuthoredColorStop[];
}

export type InterpolationColorSpace =
  | "DEFAULT"
  | "OKLAB"
  | "OKLCH"
  | "HSL"
  | "SRGB_LINEAR";

export type InterpolationHueMethod =
  | "SHORTER"
  | "LONGER"
  | "INCREASING"
  | "DECREASING";

export type NoiseType =
  | "MULTITONE"
  | "MONOTONE"
  | "DUOTONE";

export type PatternTileType =
  | "RECTANGULAR"
  | "HORIZONTAL_HEXAGONAL"
  | "VERTICAL_HEXAGONAL";

export type PatternAlignment =
  | "START"
  | "CENTER"
  | "END";

export interface FontMetaData {
  key?: FontName;
  fontLineHeight?: number;
  fontDigest?: Uint8Array;
  fontStyle?: FontStyle;
  fontWeight?: number;
}

export interface FontVariation {
  axisTag?: number;
  axisName?: string;
  value?: number;
}

export interface TextData {
  characters?: string;
  characterStyleIDs?: number[];
  styleOverrideTable?: NodeChange[];
  lines?: TextLineData[];
  layoutVersion?: number;
  fallbackFonts?: FontName[];
  minContentHeight?: number;
  layoutSize?: Vector;
  baselines?: Baseline[];
  glyphs?: Glyph[];
  decorations?: Decoration[];
  blockquotes?: Blockquote[];
  fontMetaData?: FontMetaData[];
  hyperlinkBoxes?: HyperlinkBox[];
  truncationStartIndex?: number;
  truncatedHeight?: number;
  logicalIndexToCharacterOffsetMap?: number[];
  mentionBoxes?: MentionBox[];
  derivedLines?: DerivedTextLineData[];
}

export interface DerivedTextData {
  layoutSize?: Vector;
  baselines?: Baseline[];
  glyphs?: Glyph[];
  decorations?: Decoration[];
  blockquotes?: Blockquote[];
  fontMetaData?: FontMetaData[];
  hyperlinkBoxes?: HyperlinkBox[];
  truncationStartIndex?: number;
  truncatedHeight?: number;
  logicalIndexToCharacterOffsetMap?: number[];
  mentionBoxes?: MentionBox[];
  derivedLines?: DerivedTextLineData[];
}

export interface HyperlinkBox {
  bounds?: Rect;
  url?: string;
  guid?: GUID;
  cmsTarget?: CMSItemPageTarget;
  openInNewTab?: boolean;
  hyperlinkID?: number;
}

export interface MentionBox {
  bounds?: Rect;
  startIndex?: number;
  endIndex?: number;
  isValid?: boolean;
  mentionKey?: number;
}

export interface Baseline {
  position?: Vector;
  width?: number;
  lineY?: number;
  lineHeight?: number;
  lineAscent?: number;
  ignoreLeadingTrim?: number;
  firstCharacter?: number;
  endCharacter?: number;
}

export interface Glyph {
  commandsBlob?: number;
  position?: Vector;
  styleID?: number;
  fontSize?: number;
  firstCharacter?: number;
  advance?: number;
  emojiCodePoints?: number[];
  emojiImageSet?: EmojiImageSet;
  rotation?: number;
}

export interface Decoration {
  rects?: Rect[];
  styleID?: number;
}

export interface Blockquote {
  verticalBar?: Rect;
  quoteMarkBounds?: Rect;
  styleID?: number;
}

export interface VectorData {
  vectorNetworkBlob?: number;
  normalizedSize?: Vector;
  styleOverrideTable?: NodeChange[];
}

export interface TextPathStart {
  tValue?: number;
  forward?: boolean;
}

export interface GUIDPath {
  guids?: GUID[];
}

export interface SymbolData {
  symbolID?: GUID;
  symbolOverrides?: NodeChange[];
  uniformScaleFactor?: number;
}

export interface GUIDPathMapping {
  id?: GUID;
  path?: GUIDPath;
}

export interface DerivedBreakpointData {
  overrides?: NodeChange[];
}

export interface NodeGenerationData {
  overrides?: NodeChange[];
  useFineGrainedSyncing?: boolean;
  diffOnlyRemovals?: NodeChange[];
}

export interface DerivedImmutableFrameData {
  overrides?: NodeChange[];
  version?: number;
}

export interface JsxData {
  overrides?: NodeChange[];
}

export interface DerivedJsxData {
  overrides?: NodeChange[];
}

export interface AssetIdMap {
  entries?: AssetIdEntry[];
}

export interface AssetIdEntry {
  assetKey?: string;
  assetId?: AssetId;
}

export interface AssetRef {
  key?: string;
  version?: string;
}

export interface AssetId {
  guid?: GUID;
  assetRef?: AssetRef;
  stateGroupId?: StateGroupId;
  styleId?: StyleId;
  symbolId?: SymbolId;
  variableId?: VariableID;
  variableSetId?: VariableSetID;
}

export interface StateGroupId {
  guid?: GUID;
  assetRef?: AssetRef;
}

export interface StyleId {
  guid?: GUID;
  assetRef?: AssetRef;
}

export interface SymbolId {
  guid?: GUID;
  assetRef?: AssetRef;
}

export interface VariableID {
  guid?: GUID;
  assetRef?: AssetRef;
}

export interface VariableOverrideId {
  guid?: GUID;
  assetRef?: AssetRef;
}

export interface VariableSetID {
  guid?: GUID;
  assetRef?: AssetRef;
}

export interface ModuleId {
  guid?: GUID;
  assetRef?: AssetRef;
}

export interface ResponsiveSetId {
  guid?: GUID;
  assetRef?: AssetRef;
}

export interface WebpageId {
  guid?: GUID;
  assetRef?: AssetRef;
}

export interface ThemeID {
  guid?: GUID;
  assetRef?: AssetRef;
}

export interface CodeLibraryId {
  guid?: GUID;
  assetRef?: AssetRef;
}

export interface CodeFileId {
  guid?: GUID;
  assetRef?: AssetRef;
}

export interface CodeComponentId {
  guid?: GUID;
  assetRef?: AssetRef;
}

export interface CanvasNodeId {
  guid?: GUID;
  symbolId?: SymbolId;
  stateGroupId?: StateGroupId;
}

export interface IndexRange {
  startIndex: number;
  endIndexExclusive: number;
}

export interface CollaborativeTextOpID {
  sessionID: number;
  counterID: number;
}

export type CollaborativeTextOpType =
  | "INSERT"
  | "DELETE";

export interface CollaborativeTextStrippedOpRunWithIDs {
  firstId?: CollaborativeTextOpID;
  runLength?: number;
  parentIds?: CollaborativeTextOpID[];
  rebasedOnOpIds?: CollaborativeTextOpID[];
}

export interface CollaborativeTextStrippedOpRunWithLoc {
  type?: CollaborativeTextOpType;
  range?: IndexRange;
  rangeShouldBeIteratedInReverse?: boolean;
  contentBytesInBuffer?: IndexRange;
  rebasedRange?: IndexRange;
}

export interface CollaborativeTextOpRun {
  id?: CollaborativeTextOpID;
  parentIds?: CollaborativeTextOpID[];
  type?: CollaborativeTextOpType;
  range?: IndexRange;
  rangeShouldBeIteratedInReverse?: boolean;
  content?: string;
  rebasedOnOpIds?: CollaborativeTextOpID[];
  rebasedRange?: IndexRange;
}

export interface CollaborativePlainText {
  historyOpsWithIds?: CollaborativeTextStrippedOpRunWithIDs[];
  historyOpsWithLoc?: CollaborativeTextStrippedOpRunWithLoc[];
  historyStringContentBuffer?: Uint8Array;
  changesToAppend?: CollaborativeTextOpRun[];
  snapshotText?: string;
  snapshotVersion?: CollaborativeTextOpID[];
}

export interface CollaborativeTextSelection {
  node?: GUID;
  field?: number;
  selectedRange?: IndexRange;
  caretAtFront?: boolean;
  textVersion?: CollaborativeTextOpID[];
}

export interface ResponsiveTextStyleVariant {
  minWidth?: number;
  fields?: NodeChange;
  variableFontSize?: VariableData;
  variableLineHeight?: VariableData;
  variableLetterSpacing?: VariableData;
  variableParagraphSpacing?: VariableData;
  name?: string;
}

export type FlappType =
  | "POLL"
  | "EMBED"
  | "FACEPILE"
  | "ALIGNMENT"
  | "YOUTUBE";

export interface SlideThemeProps {
  themeVersion?: string;
  variableSetId?: VariableSetID;
  textStyleIds?: StyleId[];
  isTextColorManuallySelected?: boolean;
  isBorderColorManuallySelected?: boolean;
  subscribedThemeRef?: AssetRef;
  schemaVersion?: number;
  isGeneratedFromDesign?: boolean;
}

export interface SlideThemeMap {
  entries?: SlideThemeMapEntry[];
}

export interface SlideThemeMapEntry {
  themeId?: ThemeID;
  themeProps?: SlideThemeProps;
}

export interface SharedSymbolReference {
  fileKey?: string;
  symbolID?: GUID;
  versionHash?: string;
  guidPathMappings?: GUIDPathMapping[];
  bytes?: Uint8Array;
  libraryGUIDToSubscribingGUID?: GUIDMapping[];
  componentKey?: string;
  unflatteningMappings?: GUIDPathMapping[];
  isUnflattened?: boolean;
}

export interface SharedComponentMasterData {
  componentKey?: string;
  publishingGUIDPathToTeamLibraryGUID?: GUIDPathMapping[];
  isUnflattened?: boolean;
}

export interface InstanceOverrideStash {
  overridePathOfSwappedInstance?: GUIDPath;
  componentKey?: string;
  overrides?: NodeChange[];
}

export interface InstanceOverrideStashV2 {
  overridePathOfSwappedInstance?: GUIDPath;
  localSymbolID?: GUID;
  overrides?: NodeChange[];
}

export interface ImportedCodeFileEntry {
  codeFileId?: CodeFileId;
}

export interface ImportedCodeFiles {
  entries?: ImportedCodeFileEntry[];
}

export type BlurOpType =
  | "NORMAL"
  | "PROGRESSIVE";

export type RepeatType =
  | "LINEAR"
  | "RADIAL";

export type UnitType =
  | "PIXELS"
  | "RELATIVE";

export type RepeatOrder =
  | "FORWARD"
  | "REVERSE";

export type EffectAxis =
  | "X"
  | "Y"
  | "X_AND_Y";

export interface Effect {
  type?: EffectType;
  offset?: Vector;
  radius?: number;
  visible?: boolean;
  blendMode?: BlendMode;
  spread?: number;
  showShadowBehindNode?: boolean;
  radiusVar?: VariableData;
  colorVar?: VariableData;
  spreadVar?: VariableData;
  xVar?: VariableData;
  yVar?: VariableData;
  count?: number;
  repeatType?: RepeatType;
  axis?: EffectAxis;
  unitType?: UnitType;
  order?: RepeatOrder;
  blurOpType?: BlurOpType;
  startOffset?: Vector;
  endOffset?: Vector;
  startRadius?: number;
  color?: Color;
  secondaryColor?: Color;
  authoredColor?: AuthoredColor;
  secondaryAuthoredColor?: AuthoredColor;
  noiseSize?: Vector;
  seed?: number;
  clipToShape?: boolean;
  density?: number;
  noiseType?: NoiseType;
  opacity?: number;
  refractionRadius?: number;
  specularAngle?: number;
  specularIntensity?: number;
  bevelSize?: number;
  chromaticAberration?: number;
  reflectionDistance?: number;
  refractionIntensity?: number;
  refractionRadiusVar?: VariableData;
  specularAngleVar?: VariableData;
  specularIntensityVar?: VariableData;
  chromaticAberrationVar?: VariableData;
  splayVar?: VariableData;
  refractionIntensityVar?: VariableData;
  customEffectId?: CodeComponentId;
  componentPropAssignments?: ComponentPropAssignment[];
  startRadiusVar?: VariableData;
  startOffsetXVar?: VariableData;
  startOffsetYVar?: VariableData;
  endOffsetXVar?: VariableData;
  endOffsetYVar?: VariableData;
  noiseSizeXVar?: VariableData;
  noiseSizeYVar?: VariableData;
  densityVar?: VariableData;
  effectOpacityVar?: VariableData;
  secondaryColorVar?: VariableData;
  id?: GUID;
}

export type TransformModifierType =
  | "REPEAT"
  | "SYMMETRY"
  | "SKEW";

export interface TransformModifier {
  type?: TransformModifierType;
  offset?: Vector;
  visible?: boolean;
  count?: number;
  repeatType?: RepeatType;
  axis?: EffectAxis;
  unitType?: UnitType;
  order?: RepeatOrder;
  skewX?: number;
  skewY?: number;
}

export type TransformSchemaType =
  | "NONE"
  | "FIXED_ORDER"
  | "FREEFORM";

export interface Matrix4f {
  m00: number;
  m01: number;
  m02: number;
  m03: number;
  m10: number;
  m11: number;
  m12: number;
  m13: number;
  m20: number;
  m21: number;
  m22: number;
  m23: number;
  m30: number;
  m31: number;
  m32: number;
  m33: number;
}

export interface FixedOrderTransform3d {
  perspective?: number;
  translateZ?: number;
  rotateX?: number;
  rotateY?: number;
  rotateZ?: number;
}

export type TransformFnType =
  | "NONE"
  | "MATRIX_3D"
  | "PERSPECTIVE"
  | "TRANSLATE_Z"
  | "ROTATE_X"
  | "ROTATE_Y"
  | "ROTATE_Z";

export interface TransformFnValue {
  matrix3d?: Matrix4f;
  perspective?: number;
  rotateAngle?: number;
  translateValue?: number;
}

export interface TransformFn {
  type?: TransformFnType;
  value?: TransformFnValue;
}

export interface TransformSchemaValue {
  fixedOrderTransform3d?: FixedOrderTransform3d;
  transformFunctions?: TransformFn[];
}

export interface Transform3d {
  type?: TransformSchemaType;
  value?: TransformSchemaValue;
  backfaceHidden?: boolean;
  visible?: boolean;
}

export interface NumberVector2D {
  x: Number;
  y: Number;
}

export interface Scene3d {
  perspective?: number;
  perspectiveOrigin?: NumberVector2D;
  preserve3d?: boolean;
  visible?: boolean;
}

export interface TransformOrigin {
  x?: Number;
  y?: Number;
}

export interface TransitionInfo {
  type?: TransitionType;
  duration?: number;
}

export type PrototypeDeviceType =
  | "NONE"
  | "PRESET"
  | "CUSTOM"
  | "PRESENTATION";

export type DeviceRotation =
  | "NONE"
  | "CCW_90";

export interface PrototypeDevice {
  type?: PrototypeDeviceType;
  size?: Vector;
  presetIdentifier?: string;
  rotation?: DeviceRotation;
}

export type OverlayPositionType =
  | "CENTER"
  | "TOP_LEFT"
  | "TOP_CENTER"
  | "TOP_RIGHT"
  | "BOTTOM_LEFT"
  | "BOTTOM_CENTER"
  | "BOTTOM_RIGHT"
  | "MANUAL";

export type OverlayBackgroundInteraction =
  | "NONE"
  | "CLOSE_ON_CLICK_OUTSIDE";

export type OverlayBackgroundType =
  | "NONE"
  | "SOLID_COLOR";

export interface OverlayBackgroundAppearance {
  backgroundType?: OverlayBackgroundType;
  backgroundColor?: Color;
}

export type NavigationType =
  | "NAVIGATE"
  | "OVERLAY"
  | "SWAP"
  | "SWAP_STATE"
  | "SCROLL_TO";

export type ExportColorProfile =
  | "DOCUMENT"
  | "SRGB"
  | "DISPLAY_P3_V4"
  | "CMYK";

export type ExportBackgroundType =
  | "SOLID"
  | "TRANSPARENT"
  | "GRID";

export interface ExportSettings {
  suffix?: string;
  imageType?: ImageType;
  constraint?: ExportConstraint;
  svgDataName?: boolean;
  svgIDMode?: ExportSVGIDMode;
  svgOutlineText?: boolean;
  contentsOnly?: boolean;
  svgForceStrokeMasks?: boolean;
  useAbsoluteBounds?: boolean;
  colorProfile?: ExportColorProfile;
  quality?: number;
  useBicubicSampler?: boolean;
  frameRate?: number;
  loopCount?: number;
  backgroundType?: ExportBackgroundType;
  duration?: number;
  svgAnimated?: boolean;
}

export type ExportSVGIDMode =
  | "IF_NEEDED"
  | "ALWAYS";

export interface LayoutGrid {
  type?: LayoutGridType;
  axis?: Axis;
  visible?: boolean;
  numSections?: number;
  offset?: number;
  sectionSize?: number;
  gutterSize?: number;
  color?: Color;
  pattern?: LayoutGridPattern;
  numSectionsVar?: VariableData;
  offsetVar?: VariableData;
  sectionSizeVar?: VariableData;
  gutterSizeVar?: VariableData;
}

export interface Guide {
  axis?: Axis;
  offset?: number;
  guid?: GUID;
}

export interface Path {
  windingRule?: WindingRule;
  commandsBlob?: number;
  styleID?: number;
}

export type StyleType =
  | "NONE"
  | "FILL"
  | "STROKE"
  | "TEXT"
  | "EFFECT"
  | "EXPORT"
  | "GRID"
  | "ANIMATION";

export type BrushOrientation =
  | "FORWARD"
  | "REVERSE";

export type BrushType =
  | "STRETCH"
  | "SCATTER";

export interface DynamicStrokeSettings {
  frequency?: number;
  wiggle?: number;
  smoothen?: number;
}

export interface ScatterStrokeSettings {
  gap?: number;
  wiggle?: number;
  angularJitter?: number;
  rotation?: number;
  sizeJitter?: number;
}

export interface StretchStrokeSettings {
  orientation?: BrushOrientation;
}

export interface StrokeData {
  strokes?: Stroke[];
  version?: number;
}

export interface Stroke {
  strokeId?: number;
  strokeWeight?: number;
  strokeWeightVar?: VariableData;
  strokePaint?: Paint[];
  styleIdForStrokeFill?: StyleId;
  strokeAlign?: StrokeAlign;
  strokeCap?: StrokeCap;
  strokeCapSize?: Number;
  strokeJoin?: StrokeJoin;
  miterLimit?: number;
  dashPattern?: number[];
  pathTrim?: OptionalVector;
  strokeOffset?: number;
  isDeleted?: boolean;
}

export interface VariableWidthPoint {
  position?: number;
  ascent?: number;
  descent?: number;
  segmentId?: number;
}

export interface SharedStyleReference {
  styleKey?: string;
  versionHash?: string;
}

export interface SharedStyleMasterData {
  styleKey?: string;
  sortPosition?: string;
  fileKey?: string;
}

export type ScrollBehavior =
  | "SCROLLS"
  | "FIXED_WHEN_CHILD_OF_SCROLLING_FRAME"
  | "STICKY_SCROLLS";

export interface ArcData {
  startingAngle?: number;
  endingAngle?: number;
  innerRadius?: number;
}

export interface SymbolLink {
  uri?: string;
  displayName?: string;
  displayText?: string;
}

export interface PluginData {
  pluginID?: string;
  value?: string;
  key?: string;
}

export interface PluginRelaunchData {
  pluginID?: string;
  message?: string;
  command?: string;
  isDeleted?: boolean;
  customToolId?: CodeComponentId;
}

export interface MultiplayerFieldVersion {
  counter?: number;
  sessionID?: number;
}

export type ConnectorMagnet =
  | "NONE"
  | "AUTO"
  | "TOP"
  | "LEFT"
  | "BOTTOM"
  | "RIGHT"
  | "CENTER"
  | "AUTO_HORIZONTAL"
  | "EDGE"
  | "ABSOLUTE";

export interface ConnectorEndpoint {
  endpointNodeID?: GUID;
  position?: Vector;
  magnet?: ConnectorMagnet;
  relativePosition?: Vector;
}

export interface ConnectorControlPoint {
  position?: Vector;
  axis?: Vector;
}

export type ConnectorTextSection =
  | "MIDDLE_TO_START"
  | "MIDDLE_TO_END";

export type ConnectorOffAxisOffset =
  | "NONE"
  | "ABOVE"
  | "BELOW";

export interface ConnectorTextMidpoint {
  section?: ConnectorTextSection;
  offset?: number;
  offAxisOffset?: ConnectorOffAxisOffset;
}

export type ConnectorLineStyle =
  | "ELBOWED"
  | "STRAIGHT"
  | "CURVED";

export type ConnectorType =
  | "MANUAL"
  | "DIAGRAM";

export type AnnotationPropertyType =
  | "FILL"
  | "STROKE"
  | "WIDTH"
  | "HEIGHT"
  | "MIN_WIDTH"
  | "MIN_HEIGHT"
  | "MAX_WIDTH"
  | "MAX_HEIGHT"
  | "STROKE_WIDTH"
  | "CORNER_RADIUS"
  | "EFFECT"
  | "TEXT_STYLE"
  | "TEXT_ALIGN_HORIZONTAL"
  | "FONT_FAMILY"
  | "FONT_SIZE"
  | "FONT_WEIGHT"
  | "LINE_HEIGHT"
  | "LETTER_SPACING"
  | "STACK_SPACING"
  | "STACK_PADDING"
  | "STACK_MODE"
  | "STACK_ALIGNMENT"
  | "OPACITY"
  | "COMPONENT"
  | "FONT_STYLE"
  | "GRID_ROW_GAP"
  | "GRID_COLUMN_GAP"
  | "GRID_ROW_COUNT"
  | "GRID_COLUMN_COUNT"
  | "GRID_ROW_ANCHOR_INDEX"
  | "GRID_COLUMN_ANCHOR_INDEX"
  | "GRID_ROW_SPAN"
  | "GRID_COLUMN_SPAN";

export interface AnnotationProperty {
  type?: AnnotationPropertyType;
}

export type AnnotationCategoryPreset =
  | "NONE"
  | "ACCESSIBILITY"
  | "BEHAVIOR"
  | "CONTENT"
  | "DEVELOPMENT"
  | "INTERACTION";

export type AnnotationCategoryColor =
  | "YELLOW"
  | "ORANGE"
  | "RED"
  | "PINK"
  | "VIOLET"
  | "BLUE"
  | "TEAL"
  | "GREEN";

export interface AnnotationCategoryCustom {
  color?: AnnotationCategoryColor;
  customColor?: Color;
  label?: string;
}

export interface AnnotationCategory {
  id?: GUID;
  preset?: AnnotationCategoryPreset;
  custom?: AnnotationCategoryCustom;
}

export interface AnnotationCategories {
  version?: number;
  items?: AnnotationCategory[];
}

export interface Annotation {
  label?: string;
  properties?: AnnotationProperty[];
  labelV2?: string;
  categoryId?: GUID;
}

export type AnnotationMeasurementNodeSide =
  | "TOP"
  | "BOTTOM"
  | "LEFT"
  | "RIGHT";

export interface AnnotationMeasurement {
  id?: GUID;
  fromNode?: GUID;
  toNode?: GUID;
  fromNodeSide?: AnnotationMeasurementNodeSide;
  toSameSide?: boolean;
  innerOffsetRelative?: number;
  outerOffsetFixed?: number;
  toNodeStablePath?: GUIDPath;
  freeText?: string;
}

export interface LibraryMoveInfo {
  oldKey?: string;
  pasteFileKey?: string;
}

export interface LibraryMoveHistoryItem {
  sourceNodeId?: GUID;
  sourceComponentKey?: string;
}

export interface DeveloperRelatedLink {
  nodeId?: string;
  fileKey?: string;
  linkName?: string;
  linkUrl?: string;
}

export interface WidgetPointer {
  nodeId?: GUID;
}

export interface EditInfo {
  timestampIso8601?: string;
  userId?: string;
  lastEditedAt?: number;
  createdAt?: number;
}

export type EditorType =
  | "DESIGN"
  | "WHITEBOARD"
  | "SLIDES"
  | "DEV_HANDOFF"
  | "SITES"
  | "COOPER"
  | "ILLUSTRATION"
  | "FIGMAKE"
  | "FIGSPEC";

export type MaskType =
  | "ALPHA"
  | "OUTLINE"
  | "LUMINANCE";

export type ModuleType =
  | "NONE"
  | "SINGLE_NODE"
  | "MULTI_NODE";

export type SectionStatus =
  | "NONE"
  | "BUILD"
  | "COMPLETED";

export interface SectionStatusInfo {
  status?: SectionStatus;
  lastUpdateUnixTimestamp?: number;
  description?: string;
  userId?: string;
  prevStatus?: SectionStatus;
}

export interface BuzzApprovalRequestInfo {
  requestId?: string;
  requesterUserId?: string;
  requestedAt?: number;
  reviewerUserIds?: string[];
  title?: string;
  note?: string;
  assetsInRequest?: GUID[];
}

export interface BuzzApprovalRequests {
  requests?: BuzzApprovalRequestInfo[];
}

export type BuzzApprovalNodeStatus =
  | "NONE"
  | "IN_REVIEW"
  | "APPROVED"
  | "CHANGES_REQUESTED";

export interface BuzzApprovalNodeStatusInfo {
  currentStatus?: BuzzApprovalNodeStatus;
  wasPreviouslyApproved?: boolean;
  approvalRevokedAtHistory?: number[];
}

export interface CodeEmbedInfo {
  url?: string;
  srcUrl?: string;
  title?: string;
  thumbnailImageHash?: string;
  isPublishedSite?: boolean;
}

export type VariableTimingDisplayUnit =
  | "MILLISECONDS"
  | "SECONDS";

export interface NodeChange {
  guid?: GUID;
  guidTag?: number;
  phase?: NodePhase;
  phaseTag?: number;
  parentIndex?: ParentIndex;
  parentIndexTag?: number;
  type?: NodeType;
  typeTag?: number;
  name?: string;
  nameTag?: number;
  isPublishable?: boolean;
  description?: string;
  libraryMoveInfo?: LibraryMoveInfo;
  libraryMoveHistory?: LibraryMoveHistoryItem[];
  key?: string;
  fileAssetIds?: AssetIdMap;
  styleID?: number;
  styleIDTag?: number;
  isFillStyle?: boolean;
  isStrokeStyle?: boolean;
  isOverrideOverTextStyle?: boolean;
  styleType?: StyleType;
  styleDescription?: string;
  version?: string;
  userFacingVersion?: string;
  sortPosition?: string;
  ojansSuperSecretNodeField?: SharedStyleMasterData;
  sevMoonlitLilyData?: SharedStyleMasterData;
  isSoftDeletedStyle?: boolean;
  isNonUpdateable?: boolean;
  sharedStyleMasterData?: SharedStyleMasterData;
  sharedStyleReference?: SharedStyleReference;
  inheritFillStyleID?: GUID;
  inheritStrokeStyleID?: GUID;
  inheritTextStyleID?: GUID;
  inheritExportStyleID?: GUID;
  inheritEffectStyleID?: GUID;
  inheritGridStyleID?: GUID;
  inheritFillStyleIDForStroke?: GUID;
  styleIdForFill?: StyleId;
  styleIdForStrokeFill?: StyleId;
  styleIdForText?: StyleId;
  styleIdForEffect?: StyleId;
  styleIdForGrid?: StyleId;
  styleAnimations?: StyleAnimation[];
  backgroundPaints?: Paint[];
  inheritFillStyleIDForBackground?: GUID;
  isStateGroup?: boolean;
  stateGroupPropertyValueOrders?: StateGroupPropertyValueOrder[];
  partialPasteAnnotation?: PartialPasteAnnotation;
  sharedSymbolReference?: SharedSymbolReference;
  isSymbolPublishable?: boolean;
  sharedSymbolMappings?: GUIDPathMapping[];
  sharedSymbolVersion?: string;
  sharedComponentMasterData?: SharedComponentMasterData;
  symbolDescription?: string;
  unflatteningMappings?: GUIDPathMapping[];
  forceUnflatteningMappings?: GUIDPathMapping[];
  publishFile?: string;
  sourceLibraryKey?: string;
  publishID?: GUID;
  componentKey?: string;
  isC2?: boolean;
  publishedVersion?: string;
  originComponentKey?: string;
  componentPropDefs?: ComponentPropDef[];
  componentPropRefs?: ComponentPropRef[];
  variantPropSpecs?: VariantPropSpec[];
  symbolData?: SymbolData;
  symbolDataTag?: number;
  derivedSymbolData?: NodeChange[];
  nestedInstanceResizeEnabled?: boolean;
  overriddenSymbolID?: GUID;
  componentPropAssignments?: ComponentPropAssignment[];
  propsAreBubbled?: boolean;
  overrideStash?: InstanceOverrideStash[];
  overrideStashV2?: InstanceOverrideStashV2[];
  guidPath?: GUIDPath;
  guidPathTag?: number;
  overrideLevel?: number;
  moduleType?: ModuleType;
  isSlot?: boolean;
  isSlotContent?: boolean;
  fontSize?: number;
  fontSizeTag?: number;
  paragraphIndent?: number;
  paragraphIndentTag?: number;
  paragraphSpacing?: number;
  paragraphSpacingTag?: number;
  textAlignHorizontal?: TextAlignHorizontal;
  textAlignHorizontalTag?: number;
  textAlignVertical?: TextAlignVertical;
  textAlignVerticalTag?: number;
  textCase?: TextCase;
  textCaseTag?: number;
  textDecoration?: TextDecoration;
  textDecorationTag?: number;
  lineHeight?: Number;
  lineHeightTag?: number;
  fontName?: FontName;
  fontNameTag?: number;
  textData?: TextData;
  textDataTag?: number;
  derivedTextData?: DerivedTextData;
  fontVariantCommonLigatures?: boolean;
  fontVariantContextualLigatures?: boolean;
  fontVariantDiscretionaryLigatures?: boolean;
  fontVariantHistoricalLigatures?: boolean;
  fontVariantOrdinal?: boolean;
  fontVariantSlashedZero?: boolean;
  fontVariantNumericFigure?: FontVariantNumericFigure;
  fontVariantNumericSpacing?: FontVariantNumericSpacing;
  fontVariantNumericFraction?: FontVariantNumericFraction;
  fontVariantCaps?: FontVariantCaps;
  fontVariantPosition?: FontVariantPosition;
  letterSpacing?: Number;
  fontVersion?: string;
  leadingTrim?: LeadingTrim;
  hangingPunctuation?: boolean;
  hangingList?: boolean;
  fallbackGlyphs?: boolean;
  maxLines?: number;
  responsiveTextStyleVariants?: ResponsiveTextStyleVariant[];
  sectionStatus?: SectionStatus;
  sectionStatusInfo?: SectionStatusInfo;
  textUserLayoutVersion?: number;
  textExplicitLayoutVersion?: number;
  toggledOnOTFeatures?: OpenTypeFeature[];
  toggledOffOTFeatures?: OpenTypeFeature[];
  hyperlink?: Hyperlink;
  mention?: Mention;
  fontVariations?: FontVariation[];
  textBidiVersion?: number;
  textTruncation?: TextTruncation;
  textWrapStyle?: TextWrapStyle;
  hasHadRTLText?: boolean;
  emojiImageSet?: EmojiImageSet;
  slideThumbnailHash?: string;
  visible?: boolean;
  visibleTag?: number;
  locked?: boolean;
  lockedTag?: number;
  lockMode?: LockMode;
  opacity?: number;
  opacityTag?: number;
  blendMode?: BlendMode;
  blendModeTag?: number;
  size?: Vector;
  sizeTag?: number;
  transform?: Matrix;
  transformTag?: number;
  dashPattern?: number[];
  dashPatternTag?: number;
  mask?: boolean;
  maskTag?: number;
  rotationOrigin?: Vector;
  maskIsOutline?: boolean;
  maskIsOutlineTag?: number;
  maskType?: MaskType;
  backgroundOpacity?: number;
  backgroundOpacityTag?: number;
  cornerRadius?: number;
  cornerRadiusTag?: number;
  strokeWeight?: number;
  strokeWeightTag?: number;
  strokeAlign?: StrokeAlign;
  strokeAlignTag?: number;
  strokeCap?: StrokeCap;
  strokeCapTag?: number;
  strokeCapSize?: Number;
  strokeJoin?: StrokeJoin;
  strokeJoinTag?: number;
  fillPaints?: Paint[];
  fillPaintsTag?: number;
  strokePaints?: Paint[];
  strokePaintsTag?: number;
  effects?: Effect[];
  effectsTag?: number;
  audioFills?: AudioFill[];
  audioTracks?: AudioTrack[];
  backgroundColor?: Color;
  backgroundColorTag?: number;
  fillGeometry?: Path[];
  fillGeometryTag?: number;
  strokeGeometry?: Path[];
  strokeGeometryTag?: number;
  offsetFillMaskGeometry?: Path[];
  textDecorationFillPaints?: Paint[];
  textDecorationSkipInk?: boolean;
  textUnderlineOffset?: Number;
  textDecorationThickness?: Number;
  textDecorationStyle?: TextDecorationStyle;
  transformModifiers?: TransformModifier[];
  transform3d?: Transform3d;
  strokeData?: StrokeData;
  scene3d?: Scene3d;
  transformOrigin?: TransformOrigin;
  rectangleTopLeftCornerRadius?: number;
  rectangleTopRightCornerRadius?: number;
  rectangleBottomLeftCornerRadius?: number;
  rectangleBottomRightCornerRadius?: number;
  rectangleCornerRadiiIndependent?: boolean;
  rectangleCornerToolIndependent?: boolean;
  proportionsConstrained?: boolean;
  targetAspectRatio?: OptionalVector;
  useAbsoluteBounds?: boolean;
  borderTopHidden?: boolean;
  borderBottomHidden?: boolean;
  borderLeftHidden?: boolean;
  borderRightHidden?: boolean;
  bordersTakeSpace?: boolean;
  borderTopWeight?: number;
  borderBottomWeight?: number;
  borderLeftWeight?: number;
  borderRightWeight?: number;
  borderStrokeWeightsIndependent?: boolean;
  horizontalConstraint?: ConstraintType;
  horizontalConstraintTag?: number;
  stackMode?: StackMode;
  stackModeTag?: number;
  stackSpacing?: number;
  stackSpacingTag?: number;
  stackPadding?: number;
  stackPaddingTag?: number;
  stackCounterAlign?: StackCounterAlign;
  stackJustify?: StackJustify;
  stackAlign?: StackAlign;
  stackHorizontalPadding?: number;
  stackVerticalPadding?: number;
  stackWidth?: StackSize;
  stackHeight?: StackSize;
  stackPrimarySizing?: StackSize;
  stackPrimaryAlignItems?: StackJustify;
  stackCounterAlignItems?: StackAlign;
  stackChildPrimaryGrow?: number;
  stackPaddingRight?: number;
  stackPaddingBottom?: number;
  stackChildAlignSelf?: StackCounterAlign;
  stackPositioning?: StackPositioning;
  stackReverseZIndex?: boolean;
  stackWrap?: StackWrap;
  stackCounterSpacing?: number;
  minSize?: OptionalVector;
  maxSize?: OptionalVector;
  stackCounterAlignContent?: StackCounterAlignContent;
  sortedMovingChildIndices?: number[];
  stackLayoutVersion?: number;
  gridRows?: GUIDPositionMap;
  gridColumns?: GUIDPositionMap;
  gridRowGap?: number;
  gridColumnGap?: number;
  gridRowAnchor?: GUID;
  gridColumnAnchor?: GUID;
  gridRowSpan?: number;
  gridColumnSpan?: number;
  gridColumnsSizing?: GUIDGridTrackSizeMap;
  gridRowsSizing?: GUIDGridTrackSizeMap;
  gridChildVerticalAlign?: GridChildAlign;
  gridChildHorizontalAlign?: GridChildAlign;
  gridAutoTracks?: GridAutoTracks;
  gridReflowEnabled?: boolean;
  isSnakeGameBoard?: boolean;
  transitionNodeID?: GUID;
  prototypeStartNodeID?: GUID;
  prototypeBackgroundColor?: Color;
  transitionInfo?: TransitionInfo;
  transitionType?: TransitionType;
  transitionDuration?: number;
  easingType?: EasingType;
  transitionPreserveScroll?: boolean;
  connectionType?: ConnectionType;
  connectionURL?: string;
  prototypeDevice?: PrototypeDevice;
  interactionType?: InteractionType;
  transitionTimeout?: number;
  interactionMaintained?: boolean;
  interactionDuration?: number;
  destinationIsOverlay?: boolean;
  transitionShouldSmartAnimate?: boolean;
  prototypeInteractions?: PrototypeInteraction[];
  objectAnimations?: PrototypeInteraction[];
  prototypeStartingPoint?: PrototypeStartingPoint;
  pluginData?: PluginData[];
  pluginRelaunchData?: PluginRelaunchData[];
  connectorStart?: ConnectorEndpoint;
  connectorEnd?: ConnectorEndpoint;
  connectorLineStyle?: ConnectorLineStyle;
  connectorStartCap?: StrokeCap;
  connectorEndCap?: StrokeCap;
  connectorControlPoints?: ConnectorControlPoint[];
  connectorBezierControlPoints?: ConnectorControlPoint[];
  connectorTextMidpoint?: ConnectorTextMidpoint;
  connectorType?: ConnectorType;
  connectorVersion?: number;
  annotations?: Annotation[];
  measurements?: AnnotationMeasurement[];
  annotationCategories?: AnnotationCategories;
  shapeWithTextType?: ShapeWithTextType;
  shapeUserHeight?: number;
  isStrokePaintDerived?: boolean;
  derivedImmutableFrameData?: DerivedImmutableFrameData;
  derivedImmutableFrameDataVersion?: MultiplayerFieldVersion;
  nodeGenerationData?: NodeGenerationData;
  jsxData?: JsxData;
  derivedJsxData?: DerivedJsxData;
  stableKey?: string;
  codeBlockLanguage?: CodeBlockLanguage;
  codeBlockTheme?: CodeBlockTheme;
  linkPreviewData?: LinkPreviewData;
  shapeTruncates?: boolean;
  sectionContentsHidden?: boolean;
  videoPlayback?: VideoPlayback;
  stampData?: StampData;
  sectionPresetInfo?: SectionPresetInfo;
  platformShapeDefinition?: PlatformShapeDefinition;
  widgetSyncedState?: MultiplayerMap;
  widgetSyncCursor?: number;
  widgetDerivedSubtreeCursor?: WidgetDerivedSubtreeCursor;
  widgetCachedAncestor?: WidgetPointer;
  widgetInputBehavior?: WidgetInputBehavior;
  widgetTooltip?: string;
  widgetHoverStyle?: WidgetHoverStyle;
  isWidgetStickable?: boolean;
  shouldHideCursorsOnWidgetHover?: boolean;
  widgetMetadata?: WidgetMetadata;
  widgetEvents?: WidgetEvent[];
  widgetPropertyMenuItems?: WidgetPropertyMenuItem[];
  widgetInputTextNodeType?: WidgetInputTextNodeType;
  jsxProps?: MultiplayerMap;
  tableRowPositions?: TableRowColumnPositionMap;
  tableColumnPositions?: TableRowColumnPositionMap;
  tableRowHeights?: TableRowColumnSizeMap;
  tableColumnWidths?: TableRowColumnSizeMap;
  tableMergedCells?: TableMergedCellMap;
  interactiveSlideConfigData?: MultiplayerMap;
  interactiveSlideParticipantData?: MultiplayerMap;
  flappType?: FlappType;
  isEmbeddedPrototype?: boolean;
  slideSpeakerNotes?: string;
  isSkippedSlide?: boolean;
  presentationOutlines?: MultiplayerMap;
  themeID?: ThemeID;
  slideThemeData?: SlideThemeData;
  slideThemeMap?: SlideThemeMap;
  slideTemplateFileKey?: string;
  slideNumber?: SlideNumber;
  slideNumberSeparator?: string;
  diagramParentId?: GUID;
  layoutRoot?: GUID;
  layoutPosition?: string;
  diagramLayoutRuleType?: DiagramLayoutRuleType;
  diagramParentIndex?: DiagramParentIndex;
  diagramLayoutPaused?: DiagramLayoutPaused;
  isPageDivider?: boolean;
  internalEnumForTest?: InternalEnumForTest;
  internalDataForTest?: InternalDataForTest;
  autoRename?: boolean;
  autoRenameTag?: number;
  backgroundEnabled?: boolean;
  backgroundEnabledTag?: number;
  exportContentsOnly?: boolean;
  exportContentsOnlyTag?: number;
  miterLimit?: number;
  miterLimitTag?: number;
  textTracking?: number;
  textTrackingTag?: number;
  verticalConstraint?: ConstraintType;
  verticalConstraintTag?: number;
  exportSettings?: ExportSettings[];
  exportSettingsTag?: number;
  textAutoResize?: TextAutoResize;
  textAutoResizeTag?: number;
  layoutGrids?: LayoutGrid[];
  layoutGridsTag?: number;
  frameMaskDisabled?: boolean;
  frameMaskDisabledTag?: number;
  resizeToFit?: boolean;
  resizeToFitTag?: number;
  booleanOperation?: BooleanOperation;
  booleanOperationTag?: number;
  handleMirroring?: VectorMirror;
  handleMirroringTag?: number;
  count?: number;
  countTag?: number;
  starInnerScale?: number;
  starInnerScaleTag?: number;
  arcData?: ArcData;
  vectorData?: VectorData;
  vectorDataTag?: number;
  vectorOperationVersion?: number;
  textPathStart?: TextPathStart;
  exportBackgroundDisabled?: boolean;
  guides?: Guide[];
  internalOnly?: boolean;
  scrollDirection?: ScrollDirection;
  cornerSmoothing?: number;
  scrollOffset?: Vector;
  exportTextAsSVGText?: boolean;
  scrollContractedState?: ScrollContractedState;
  contractedSize?: Vector;
  fixedChildrenDivider?: string;
  scrollBehavior?: ScrollBehavior;
  derivedSymbolDataLayoutVersion?: number;
  navigationType?: NavigationType;
  overlayPositionType?: OverlayPositionType;
  overlayRelativePosition?: Vector;
  overlayBackgroundInteraction?: OverlayBackgroundInteraction;
  overlayBackgroundAppearance?: OverlayBackgroundAppearance;
  overrideKey?: GUID;
  containerSupportsFillStrokeAndCorners?: boolean;
  stackCounterSizing?: StackSize;
  containersSupportFillStrokeAndCorners?: boolean;
  keyTrigger?: KeyTrigger;
  voiceEventPhrase?: string;
  ancestorPathBeforeDeletion?: GUID[];
  symbolLinks?: SymbolLink[];
  textListData?: TextListData;
  detachOpticalSizeFromFontSize?: boolean;
  listSpacing?: number;
  embedData?: EmbedData;
  richMediaData?: RichMediaData;
  renderedSyncedState?: MultiplayerMap;
  simplifyInstancePanels?: boolean;
  accessibleHTMLTag?: HTMLTag;
  ariaRole?: ARIARole;
  ariaAttributes?: ARIAAttributesMap;
  accessibleLabel?: string;
  isDecorativeImage?: boolean;
  variableData?: VariableData;
  variableConsumptionMap?: VariableDataMap;
  variableModeBySetMap?: VariableModeBySetMap;
  variableSetModes?: VariableSetMode[];
  variableSetID?: VariableSetID;
  variableResolvedType?: VariableResolvedDataType;
  variableDataValues?: VariableDataValues;
  variableTokenName?: string;
  timingDisplayUnit?: VariableTimingDisplayUnit;
  variableScopes?: VariableScope[];
  parameterConsumptionMap?: VariableDataMap;
  codeSyntax?: CodeSyntaxMap;
  pasteSource?: PasteSource;
  pageType?: EditorType;
  strokeBrushGuid?: GUID;
  strokeSeed?: bigint;
  variableWidthPoints?: VariableWidthPoint[];
  dynamicStrokeSettings?: DynamicStrokeSettings;
  scatterStrokeSettings?: ScatterStrokeSettings;
  stretchStrokeSettings?: StretchStrokeSettings;
  scatterBrushTransforms?: Matrix[];
  brushType?: BrushType;
  pathTrim?: OptionalVector;
  strokeOffset?: number;
  backingVariableSetId?: VariableSetID;
  overriddenVariableId?: VariableID;
  backingVariableId?: VariableIdOrVariableOverrideId;
  isCollectionExtendable?: boolean;
  rootVariableKey?: string;
  inheritedVariableIds?: InheritedVariablesData;
  handoffStatusMap?: HandoffStatusMap;
  agendaPositionMap?: AgendaPositionMap;
  agendaMetadataMap?: AgendaMetadataMap;
  migrationStatus?: MigrationStatus;
  isSoftDeleted?: boolean;
  editInfo?: EditInfo;
  colorProfile?: ColorProfile;
  detachedSymbolId?: SymbolId;
  childReadingDirection?: ChildReadingDirection;
  readingIndex?: string;
  documentColorProfile?: DocumentColorProfile;
  developerRelatedLinks?: DeveloperRelatedLink[];
  slideActiveThemeLibKey?: string;
  editScopeInfo?: EditScopeInfo;
  semanticWeight?: SemanticWeight;
  semanticItalic?: SemanticItalic;
  areSlidesManuallyIndented?: boolean;
  isResponsiveSet?: boolean;
  derivedBreakpointData?: DerivedBreakpointData;
  defaultResponsiveSetId?: GUID;
  isPrimaryBreakpoint?: boolean;
  primaryResponsiveNodeId?: GUID;
  multiEditGlueId?: GUID;
  breakpointMinWidth?: number;
  isBreakpointInFocus?: boolean;
  responsiveSetSettings?: ResponsiveSetSettings;
  behaviors?: NodeBehaviors;
  sourceCode?: string;
  sourceCodeCollaborativeTextVersion?: CollaborativeTextOpID[];
  collaborativeSourceCode?: CollaborativePlainText;
  belongsToCodeLibraryId?: CodeLibraryId;
  importedCodeFiles?: ImportedCodeFiles;
  codeFileCanvasNodeId?: CanvasNodeId;
  isEntrypointCodeFile?: boolean;
  componentOrStateGroupKey?: string;
  componentOrStateGroupVersion?: number;
  sourceCodeLibraryKey?: string;
  sourceCodeLibraryKeys?: string[];
  usedMakeLibraries?: UsedMakeLibrary[];
  makeLibraryComponentId?: string;
  shouldHidePreviewForMakeKitCreation?: boolean;
  isMakeKit?: boolean;
  codePreviewSettings?: PrototypeDevice;
  codeExamples?: CodeExample[];
  exportedFromCodeFileId?: CodeFileId;
  codeExportName?: string;
  codeComponentDescription?: string;
  backingCodeComponentId?: CodeComponentId;
  isMainCodeComponent?: boolean;
  codeSnapshotState?: CodeSnapshotState;
  chatMessages?: NodeChatMessage[];
  chatCompressionState?: NodeChatCompressionState;
  aiChatThread?: AIChatThread;
  codeChatMessagesKey?: string;
  codeSnapshot?: CodeSnapshot;
  codeSnapshotLayers?: CodeSnapshotLayers;
  codeSnapshotInvalidatedAt?: number;
  isCodeBehavior?: boolean;
  autoForkCode?: boolean;
  hasBeenManuallyRenamed?: boolean;
  codeCreatedFromDesign?: boolean;
  codeCreatedFromDesignNodeId?: CanvasNodeId;
  imageImports?: ImageImportMap;
  codeObjectType?: CodeObjectType;
  codeFilePath?: string;
  codeBehaviorData?: CodeBehaviorData;
  codeLibraryFormat?: number;
  isCodePreviewPlayingOnCanvas?: boolean;
  codeEmbedInfo?: CodeEmbedInfo;
  isEmbedCodeLayer?: boolean;
  codeSourceInfo?: CodeSourceInfo;
  mimeType?: string;
  blobRef?: Uint8Array;
  cmsSelector?: CMSSelector;
  cmsConsumptionMap?: CMSConsumptionMap;
  cmsRichTextStyleMap?: CMSRichTextStyleMap;
  repeaterSymbolId?: SymbolId;
  repeaterCmsOverrideData?: RepeaterCmsOverrideData;
  repeaterSymbolOverrideData?: RepeaterSymbolOverrideData;
  repeaterOverrideData?: RepeaterOverrideData;
  aiEditedNodeChangeFieldNumbers?: number[];
  aiEditScopeLabel?: string;
  firstDraftData?: FirstDraftData;
  firstDraftKitElementData?: FirstDraftKitElementData;
  cooperRevertData?: CooperRevertData;
  cooperTemplateData?: CooperTemplateData;
  buzzApprovalRequests?: BuzzApprovalRequests;
  buzzApprovalNodeStatusInfo?: BuzzApprovalNodeStatusInfo;
  hubFileAttribution?: HubFileAttribution;
  managedStringData?: ManagedStringData;
  thumbnailInfo?: ThumbnailInfo;
  aiCanvasPrompt?: AiCanvasPrompt;
  backingNodeId?: CanvasNodeId;
  pageStatus?: string;
  motionTransform?: TRSSTransform2D;
  linkMotionScaleAspectRatio?: boolean;
  timelinePosition?: bigint;
  keyframeValue?: KeyframeValueData;
  keyframeValueRef?: VariableData;
  interpolationType?: InterpolationType;
  bezierHandles?: BezierHandles;
  easingData?: EasingData;
  motionPathBezierHandles?: BezierHandles;
  interpolationColorSpace?: InterpolationColorSpace;
  interpolationHueMethod?: InterpolationHueMethod;
  keyframeOperation?: KeyframeOperation;
  timelinePositionType?: TimelinePositionType;
  trackLoopMode?: TrackLoopMode;
  isClip?: boolean;
  clipId?: GUID;
  timelineDuration?: bigint;
  timelineKeyframeSnappingFps?: FrameRate;
  quantizeTimelinePlayback?: boolean;
  timelineOffset?: bigint;
  timelineDisabled?: boolean;
  playbackStyle?: PlaybackStyle;
  timelineDefinitions?: TimelineDefinitionsMap;
  timelineAssignments?: TimelineAssignmentsMap;
  animationPresets?: AnimationPresets;
  styleIdsForAnimation?: StyleIdForAnimation[];
  backingAnimationPresetId?: AnimationPresetId;
  tools?: Tools;
  customEffects?: CustomEffects;
  transitionOverrides?: TransitionOverrideData;
  useLegacySmartAnimate?: boolean;
  sourceControlConfig?: SourceControlConfig;
  makeContentState?: MakeContentState;
  specBlockType?: SpecBlockType;
  specBlockContent?: CollaborativePlainText;
  specCodeBlockLanguage?: string;
  specBlockTableAlignment?: string;
  specBlockIndentLevel?: number;
  specImageHash?: string;
  specWidth?: number;
  specHeight?: number;
  specBlockTableRowHeights?: TableRowColumnSizeMap;
  specBlockTableColumnWidths?: TableRowColumnSizeMap;
  specEmbedUrl?: string;
  specCanvasScrollEnabled?: boolean;
  placeholder?: boolean;
  placeholderClientLifecycleId?: string;
  placeholderInvalidateAt?: number;
  disableJitDst?: boolean;
  customToolArtifactRef?: CustomToolArtifactRef;
  weaveConnection?: WeaveConnection;
  weaveLayerConnections?: WeaveLayerConnection[];
  weaveLayerId?: string;
}

export type GitRepoRefProvider =
  | "UGIT"
  | "GITHUB"
  | "OTHER";

export interface GitRepoRef {
  provider?: GitRepoRefProvider;
  gitRepo?: string;
  gitRef?: string;
  gitBaseRef?: string;
}

export interface SourceControlConfig {
  origin?: GitRepoRef;
  upstream?: GitRepoRef;
}

export type MakeContentState =
  | "UNKNOWN"
  | "EMPTY"
  | "POPULATED"
  | "SEEDED";

export interface CodeSnapshot {
  state?: CodeSnapshotState;
  invalidatedAt?: number;
  cachedPreviewStatus?: CachedPreviewStatus;
  commitSha?: string;
  paints?: Paint[];
  offset?: Vector;
  layoutSize?: Vector;
  canvasSize?: Vector;
  devicePixelRatio?: number;
}

export interface CodeOutputLayer {
  node?: NodeChange;
  sourceNodeId?: GUID;
}

export interface CodeSnapshotLayers {
  state?: CodeSnapshotState;
  invalidatedAt?: number;
  cachedPreviewStatus?: CachedPreviewStatus;
  layers?: CodeOutputLayer[];
}

export interface CodeBehaviorData {
  name?: string;
  icon?: string;
  nodeTypes?: string[];
  category?: string;
  apiVersion?: number;
}

export interface CodeExample {
  exampleName?: string;
  codeExportName?: string;
}

export interface UsedMakeLibrary {
  makeLibraryId?: string;
}

export interface CookieBannerText {
  bannerHeader?: string;
  bannerDisclaimerExplicit?: string;
  bannerDisclaimerImplicit?: string;
  policyLabel?: string;
  acceptText?: string;
  acknowledgeText?: string;
  manageText?: string;
  rejectText?: string;
  necessaryText?: string;
  necessaryDescription?: string;
  analyticsText?: string;
  analyticsDescription?: string;
  preferencesText?: string;
  preferencesDescription?: string;
  marketingText?: string;
  marketingDescription?: string;
  saveLabel?: string;
  triggerLabel?: string;
}

export interface CookieBannerSettings {
  enabled?: boolean;
  componentType?: CookieBannerComponentType;
  xAlignment?: CookieXAlignment;
  yAlignment?: CookieYAlignment;
  triggerXAlignment?: CookieXAlignment;
  triggerYAlignment?: CookieYAlignment;
  triggerComponentType?: TriggerComponentType;
  policyUrl?: string;
  text?: CookieBannerText;
  policyLink?: GUID;
  locale?: string;
}

export type CookieBannerComponentType =
  | "BANNER"
  | "MODAL";

export type TriggerComponentType =
  | "BANNER"
  | "TAG";

export type CookieXAlignment =
  | "LEFT"
  | "CENTER"
  | "RIGHT";

export type CookieYAlignment =
  | "TOP"
  | "CENTER"
  | "BOTTOM";

export interface ResponsiveSetSettings {
  title?: string;
  description?: string;
  scalingMode?: ResponsiveScalingMode;
  scalingMinFontSize?: number;
  scalingMaxFontSize?: number;
  scalingMinLayoutWidth?: number;
  scalingMaxLayoutWidth?: number;
  lang?: string;
  faviconHash?: string;
  socialImageHash?: string;
  googleAnalyticsID?: string;
  blockSearchIndexing?: boolean;
  customCodeHeadStart?: string;
  customCodeHeadEnd?: string;
  customCodeBodyStart?: string;
  customCodeBodyEnd?: string;
  faviconID?: GUID;
  socialImageID?: GUID;
  addBypassLinks?: boolean;
  ignoreReducedMotion?: boolean;
  cookieBanner?: CookieBannerSettings;
}

export type ResponsiveScalingMode =
  | "REFLOW"
  | "SCALE";

export interface CMSSelector {
  cmsCollectionId?: string;
  filterCriteria?: CMSFilterCritera;
  sorts?: CMSSelectorSort[];
  limit?: number;
}

export interface CMSFilterCritera {
  matchType?: CMSFilterCriteriaMatchType;
  filters?: CMSSelectorFilter[];
}

export type CMSFilterCriteriaMatchType =
  | "MATCH_ALL"
  | "MATCH_ANY";

export interface CMSSelectorFilter {
  cmsFieldId?: string;
  op?: CMSSelectorFilterOperator;
  comparisonValue?: string;
}

export type CMSSelectorFilterOperator =
  | "EQUALS";

export interface CMSSelectorSort {
  cmsFieldId?: string;
  orderBy?: CMSFieldOrderBy;
}

export type CMSFieldOrderBy =
  | "ASCENDING"
  | "DESCENDING";

export interface CMSConsumptionMap {
  entries?: CMSConsumptionMapEntry[];
}

export interface CMSConsumptionMapEntry {
  consumptionField?: CMSConsumptionField;
  cmsFieldId?: string;
}

export type CMSConsumptionField =
  | "MISSING"
  | "TEXT_DATA";

export interface CMSRichTextStyleMap {
  entries?: CMSRichTextStyleEntry[];
}

export interface CMSRichTextStyleEntry {
  styleClass?: CMSRichTextStyleClass;
  textDescriptor?: CMSRichTextDescriptor;
}

export type CMSRichTextStyleClass =
  | "HEADING1"
  | "HEADING2"
  | "HEADING3"
  | "HEADING4"
  | "HEADING5"
  | "HEADING6"
  | "PARAGRAPH"
  | "LINK"
  | "BLOCKQUOTE";

export interface CMSRichTextDescriptor {
  textStyleId?: StyleId;
  fontNameVariants?: FontName[];
}

export interface RepeaterCmsOverrideData {
  overrides?: NodeChange[];
}

export interface RepeaterOverrideData {
  parentIndexOverrides?: NodeChange[];
}

export interface RepeaterSymbolOverrideData {
  overridesByPosition?: RepeaterPositionOverrides[];
}

export interface RepeaterPositionOverrides {
  position?: ParentIndex;
  overrides?: NodeChange[];
}

export interface InheritedVariablesData {
  variableIds?: InheritedVariableEntry[];
}

export interface InheritedVariableEntry {
  variableId?: VariableID;
}

export interface HubFileAttribution {
  hubFileId?: string;
  hubFileName?: string;
}

export interface ManagedStringData {
  key?: string;
  context?: string;
  locale?: string;
  content?: ManagedStringNode;
  contentSchema?: ManagedStringContentSchema;
}

export type ManagedStringContentSchema =
  | "V0";

export type ManagedStringNodeType =
  | "TEXT"
  | "CONCATENATE"
  | "PLURAL"
  | "PLACEHOLDER";

export interface ManagedStringNode {
  type?: ManagedStringNodeType;
  textNodeData?: ManagedStringTextNodeData;
  concatenateNodeData?: ManagedStringConcatenateAstNodeData;
  pluralNodeData?: ManagedStringPluralAstNodeData;
  placeholderNodeData?: ManagedStringPlaceholderAstNodeData;
}

export interface ManagedStringTextNodeData {
  value?: string;
}

export interface ManagedStringConcatenateAstNodeData {
  values?: ManagedStringNode[];
}

export type ManagedStringPluralType =
  | "ZERO"
  | "ONE"
  | "TWO"
  | "FEW"
  | "MANY"
  | "OTHER";

export interface ManagedStringPluralAstNodeData {
  identifier?: string;
  conditions?: ManagedStringPluralTypeMapEntry[];
}

export interface ManagedStringPluralTypeMapEntry {
  key?: ManagedStringPluralType;
  value?: ManagedStringNode;
}

export type ManagedStringFormatType =
  | "TEXT"
  | "DATE"
  | "TIME"
  | "NUMBER";

export interface ManagedStringPlaceholderAstNodeData {
  identifier?: string;
  formatType?: ManagedStringFormatType;
  formatPattern?: string;
}

export interface CooperRevertData {
  originalValues?: NodeChange;
}

export interface VideoPlayback {
  autoplay?: boolean;
  mediaLoop?: boolean;
  muted?: boolean;
  showControls?: boolean;
  startTimeMs?: number;
  endTimeMs?: number;
  playbackRate?: number;
}

export type MediaAction =
  | "PLAY"
  | "PAUSE"
  | "TOGGLE_PLAY_PAUSE"
  | "MUTE"
  | "UNMUTE"
  | "TOGGLE_MUTE_UNMUTE"
  | "SKIP_FORWARD"
  | "SKIP_BACKWARD"
  | "SKIP_TO"
  | "SET_PLAYBACK_RATE";

export type AnimationTimelineAction =
  | "PLAY"
  | "PAUSE"
  | "TOGGLE_PLAY_PAUSE"
  | "SET_PLAYHEAD";

export interface WidgetHoverStyle {
  fillPaints?: Paint[];
  strokePaints?: Paint[];
  opacity?: number;
  areFillPaintsSet?: boolean;
  areStrokePaintsSet?: boolean;
  isOpacitySet?: boolean;
}

export interface WidgetDerivedSubtreeCursor {
  sessionID?: number;
  counter?: number;
}

export interface MultiplayerMap {
  entries?: MultiplayerMapEntry[];
}

export interface MultiplayerMapEntry {
  key?: string;
  value?: string;
}

export interface VariableDataMap {
  entries?: VariableDataMapEntry[];
}

export interface VariableDataMapEntry {
  nodeField?: number;
  variableData?: VariableData;
  variableField?: VariableField;
}

export type VariableField =
  | "MISSING"
  | "CORNER_RADIUS"
  | "PARAGRAPH_SPACING"
  | "PARAGRAPH_INDENT"
  | "STROKE_WEIGHT"
  | "STACK_SPACING"
  | "STACK_PADDING_LEFT"
  | "STACK_PADDING_TOP"
  | "STACK_PADDING_RIGHT"
  | "STACK_PADDING_BOTTOM"
  | "VISIBLE"
  | "TEXT_DATA"
  | "WIDTH"
  | "HEIGHT"
  | "RECTANGLE_TOP_LEFT_CORNER_RADIUS"
  | "RECTANGLE_TOP_RIGHT_CORNER_RADIUS"
  | "RECTANGLE_BOTTOM_LEFT_CORNER_RADIUS"
  | "RECTANGLE_BOTTOM_RIGHT_CORNER_RADIUS"
  | "BORDER_TOP_WEIGHT"
  | "BORDER_BOTTOM_WEIGHT"
  | "BORDER_LEFT_WEIGHT"
  | "BORDER_RIGHT_WEIGHT"
  | "VARIANT_PROPERTIES"
  | "STACK_COUNTER_SPACING"
  | "MIN_WIDTH"
  | "MAX_WIDTH"
  | "MIN_HEIGHT"
  | "MAX_HEIGHT"
  | "FONT_FAMILY"
  | "FONT_STYLE"
  | "FONT_VARIATIONS"
  | "OPACITY"
  | "FONT_SIZE"
  | "LETTER_SPACING"
  | "LINE_HEIGHT"
  | "OVERRIDDEN_SYMBOL_ID"
  | "HYPERLINK"
  | "CMS_SERIALIZED_RICH_TEXT_DATA"
  | "SLOT_CONTENT_ID"
  | "GRID_ROW_GAP"
  | "GRID_COLUMN_GAP"
  | "X_POSITION"
  | "Y_POSITION"
  | "ROTATION"
  | "MOTION_TRANSLATION_X"
  | "MOTION_TRANSLATION_Y"
  | "MOTION_ROTATION"
  | "MOTION_SCALE_X"
  | "MOTION_SCALE_Y"
  | "MOTION_SHEAR"
  | "SCROLL_OFFSET_X"
  | "SCROLL_OFFSET_Y"
  | "PATH_TRIM_START"
  | "PATH_TRIM_END"
  | "DISSOLVE_PROGRESS"
  | "EASING_DATA"
  | "MEDIA_CURRENT_TIME"
  | "TRANSFORM_3D_PERSPECTIVE"
  | "TRANSFORM_3D_TRANSLATION_Z"
  | "TRANSFORM_3D_ROTATION_X"
  | "TRANSFORM_3D_ROTATION_Y"
  | "TRANSFORM_3D_ROTATION_Z"
  | "POLYGON_COUNT"
  | "ARC_DATA_STARTING_ANGLE"
  | "ARC_DATA_ENDING_ANGLE"
  | "ARC_DATA_INNER_RADIUS"
  | "KEYFRAME_VALUE"
  | "MOTION_TRANSLATION_XY"
  | "MOTION_SCALE_XY"
  | "SCENE_3D_PERSPECTIVE"
  | "STAR_INNER_SCALE"
  | "MOTION_TRANSFORM_ORIGIN_XY"
  | "MOTION_TRANSFORM_ORIGIN_X"
  | "MOTION_TRANSFORM_ORIGIN_Y";

export interface VariableModeBySetMap {
  entries?: VariableModeBySetMapEntry[];
}

export interface VariableModeBySetMapEntry {
  variableSetID?: VariableSetID;
  variableModeID?: GUID;
  variableSetExtensionID?: VariableSetID;
}

export interface CodeSyntaxMap {
  entries?: CodeSyntaxMapEntry[];
}

export interface CodeSyntaxMapEntry {
  platform?: CodeSyntaxPlatform;
  value?: string;
}

export interface TableMergedCellMap {
  entries?: TableMergedCellMapEntry[];
}

export interface TableMergedCellMapEntry {
  rowId?: GUID;
  colId?: GUID;
  rowSpan?: number;
  colSpan?: number;
}

export interface TableRowColumnPositionMap {
  entries?: TableRowColumnPositionMapEntry[];
}

export interface TableRowColumnPositionMapEntry {
  id?: GUID;
  position?: string;
}

export interface GUIDPositionMap {
  entries?: GUIDPositionMapEntry[];
}

export interface GUIDPositionMapEntry {
  id?: GUID;
  position?: string;
}

export interface GUIDGridTrackSizeMap {
  entries?: GUIDGridTrackSizeMapEntry[];
}

export interface GUIDGridTrackSizeMapEntry {
  id?: GUID;
  trackSize?: GridTrackSize;
}

export interface ObjectAnimationList {
  entries?: ObjectAnimationListItem[];
}

export interface ObjectAnimationListItem {
  targetNodeId?: GUID;
  animation?: PrototypeAction;
}

export interface GridTrackSize {
  minSizing?: GridTrackSizingFunction;
  maxSizing?: GridTrackSizingFunction;
}

export interface GridTrackSizingFunction {
  type?: GridTrackSizingType;
  value?: number;
}

export type GridTrackSizingType =
  | "FLEX"
  | "FIXED"
  | "HUG";

export interface TableRowColumnSizeMap {
  entries?: TableRowColumnSizeMapEntry[];
}

export interface TableRowColumnSizeMapEntry {
  id?: GUID;
  size?: number;
}

export interface AgendaPositionMap {
  entries?: AgendaPositionMapEntry[];
}

export interface AgendaPositionMapEntry {
  id?: GUID;
  position?: string;
}

export type AgendaItemType =
  | "NODE"
  | "BLOCK";

export interface AgendaMetadataMap {
  entries?: AgendaMetadataMapEntry[];
}

export interface AgendaMetadataMapEntry {
  id?: GUID;
  data?: AgendaMetadata;
}

export interface AgendaMetadata {
  name?: string;
  type?: AgendaItemType;
  targetNodeID?: GUID;
  timerInfo?: AgendaTimerInfo;
  voteInfo?: AgendaVoteInfo;
  musicInfo?: AgendaMusicInfo;
}

export interface AgendaTimerInfo {
  timerLength?: number;
}

export interface AgendaVoteInfo {
  voteCount?: number;
}

export interface AgendaMusicInfo {
  songID?: string;
  startTimeMs?: number;
}

export type DiagramLayoutRuleType =
  | "NONE"
  | "TREE";

export interface DiagramParentIndex {
  guid: GUID;
  position: string;
}

export type DiagramLayoutPaused =
  | "NO"
  | "YES";

export interface ComponentPropRef {
  nodeField?: number;
  defID?: GUID;
  zombieFallbackName?: string;
  componentPropNodeField?: ComponentPropNodeField;
  isDeleted?: boolean;
}

export type ComponentPropNodeField =
  | "VISIBLE"
  | "TEXT_DATA"
  | "OVERRIDDEN_SYMBOL_ID"
  | "INHERIT_FILL_STYLE_ID"
  | "SLOT_CONTENT_ID";

export interface ComponentPropAssignment {
  defID?: GUID;
  value?: ComponentPropValue;
  varValue?: VariableData;
  legacyDerivedTextData?: DerivedTextData;
}

export interface ComponentPropDef {
  id?: GUID;
  name?: string;
  initialValue?: ComponentPropValue;
  sortPosition?: string;
  parentPropDefId?: GUID;
  type?: ComponentPropType;
  isDeleted?: boolean;
  preferredValues?: ComponentPropPreferredValues;
  varValue?: VariableData;
  parameterConfig?: ParameterConfig;
  description?: string;
  slotPropConfig?: SlotPropConfig;
  colorArrayConfig?: ColorArrayConfig;
  visibleWhen?: ComponentPropVisibilityClause[];
}

export interface ComponentPropValue {
  boolValue?: boolean;
  textValue?: TextData;
  guidValue?: GUID;
  floatValue?: number;
  easingData?: EasingData;
  vectorValue?: Vector;
  lineValue?: Line;
  circleValue?: Circle;
  rotation3DValue?: Rotation3D;
  circlePointValue?: CirclePoint;
  gradientValue?: Gradient;
  colorPointValue?: ColorPoint;
  colorArrayValue?: ColorArray;
  paintValue?: Paint;
}

export interface TimelineData {
  durationUs?: bigint;
  defaultTimeline?: boolean;
  parentTimelineDefId?: GUID;
  playbackStyle?: PlaybackStyle;
  autoplay?: boolean;
  keyframeSnappingFps?: FrameRate;
  quantizePlayback?: boolean;
}

export interface TimelineDefinitionsMap {
  entries?: TimelineDefinitionsMapEntry[];
}

export interface TimelineDefinitionsMapEntry {
  id?: GUID;
  data?: TimelineData;
}

export interface TimelineAssignmentKey {
  assignedTimelineId?: GUID;
  containingTimelineId?: GUID;
}

export interface TimelineBindingData {
  offsetUs?: bigint;
  disabled?: boolean;
  autoplay?: boolean;
}

export interface TimelineAssignmentsMap {
  entries?: TimelineAssignmentsMapEntry[];
}

export interface TimelineAssignmentsMapEntry {
  key?: TimelineAssignmentKey;
  value?: TimelineBindingData;
}

export type ComponentPropType =
  | "BOOL"
  | "TEXT"
  | "COLOR"
  | "INSTANCE_SWAP"
  | "VARIANT"
  | "NUMBER"
  | "IMAGE"
  | "SLOT"
  | "EASING"
  | "COLOR_ARRAY"
  | "VECTOR"
  | "LINE"
  | "CIRCLE"
  | "ROTATION_3D"
  | "CIRCLE_POINT"
  | "GRADIENT"
  | "COLOR_POINT"
  | "PAINT";

export interface ComponentPropPreferredValues {
  stringValues?: string[];
  instanceSwapValues?: InstanceSwapPreferredValue[];
}

export interface ComponentPropVisibilityClause {
  siblingPropDefMatches?: ComponentPropSiblingMatch[];
}

export interface ComponentPropSiblingMatch {
  propName?: string;
  anyOf?: ComponentPropVisibilityValue[];
}

export interface ComponentPropVisibilityValue {
  stringValue?: string;
  floatValue?: number;
  boolValue?: boolean;
}

export interface ParameterConfig {
  numberPropConfig?: NumberPropConfig;
  control?: ParameterConfigControl;
  sliderConfig?: SliderConfig;
  label?: VariableData;
  inputConfig?: InputConfig;
  selectConfig?: SelectConfig;
  pointConfig?: PointConfig;
  lineConfig?: LineConfig;
  pointRadiusConfig?: PointRadiusConfig;
  rotation3DConfig?: Rotation3DConfig;
  circlePointConfig?: CirclePointConfig;
  colorPointConfig?: ColorPointConfig;
  showDividerAbove?: boolean;
}

export type ParameterConfigControl =
  | "DEFAULT"
  | "SLIDER"
  | "INPUT"
  | "SELECT";

export interface InputConfig {
  unit?: VariableData;
  min?: VariableData;
  max?: VariableData;
  icon?: string;
}

export interface SliderConfig {
  min?: VariableData;
  max?: VariableData;
  step?: VariableData;
  unit?: VariableData;
}

export type PointMode =
  | "CANVAS_AND_UI"
  | "CANVAS"
  | "UI";

export interface PointConfig {
  mode?: PointMode;
  unit?: NumberUnits;
}

export interface Line {
  a?: Vector;
  b?: Vector;
}

export interface LineConfig {
  mode?: PointMode;
  unit?: NumberUnits;
}

export interface Circle {
  center?: Vector;
  radius?: number;
}

export interface PointRadiusConfig {
  mode?: PointMode;
  positionUnit?: NumberUnits;
  radiusUnit?: NumberUnits;
  minRadius?: number;
  maxRadius?: number;
}

export interface Rotation3D {
  x?: number;
  y?: number;
  z?: number;
  translateZ?: number;
}

export interface Rotation3DConfig {
  mode?: PointMode;
}

export interface CirclePoint {
  center?: Vector;
  radius?: number;
  angle?: number;
}

export interface CirclePointConfig {
  mode?: PointMode;
  positionUnit?: NumberUnits;
  radiusUnit?: NumberUnits;
  minRadius?: number;
  maxRadius?: number;
}

export interface ColorPoint {
  point?: Vector;
  color?: VariableData;
}

export interface ColorPointConfig {
  mode?: PointMode;
  unit?: NumberUnits;
}

export interface Gradient {
  stops?: GradientStop[];
}

export interface GradientStop {
  position?: number;
  color?: VariableData;
}

export interface GradientParameterValue {
  stops?: ColorStop[];
  transform?: Matrix;
  opacity?: number;
}

export interface SelectOption {
  value?: VariableData;
  label?: string;
  icon?: string;
}

export interface SelectConfig {
  options?: SelectOption[];
}

export interface ColorArrayConfig {
  minLength?: number;
  maxLength?: number;
}

export interface SlotPropConfig {
  stretchChildOnInsert?: boolean;
  displayByDefault?: boolean;
  minChildren?: number;
  maxChildren?: number;
  allowPreferredValuesOnly?: boolean;
}

export interface NumberPropConfig {
  control?: ParameterConfigControl;
  min?: VariableData;
  max?: VariableData;
  step?: VariableData;
}

export interface InstanceSwapPreferredValue {
  type?: InstanceSwapPreferredValueType;
  key?: string;
}

export type InstanceSwapPreferredValueType =
  | "COMPONENT"
  | "STATE_GROUP";

export type WidgetEvent =
  | "MOUSE_DOWN"
  | "CLICK"
  | "TEXT_EDIT_END"
  | "ATTACHED_STICKABLES_CHANGED"
  | "STUCK_STATUS_CHANGED";

export type WidgetInputBehavior =
  | "WRAP"
  | "TRUNCATE"
  | "MULTILINE";

export interface WidgetMetadata {
  pluginID?: string;
  pluginVersionID?: string;
  widgetName?: string;
  isResizable?: boolean;
  isRotatable?: boolean;
}

export type WidgetPropertyMenuItemType =
  | "ACTION"
  | "SEPARATOR"
  | "COLOR"
  | "DROPDOWN"
  | "COLOR_SELECTOR"
  | "TOGGLE"
  | "LINK";

export interface WidgetPropertyMenuSelectorOption {
  option?: string;
  tooltip?: string;
}

export type WidgetInputTextNodeType =
  | "WIDGET_CONTROLLED"
  | "RICH_TEXT";

export interface WidgetPropertyMenuItem {
  propertyName?: string;
  tooltip?: string;
  itemType?: WidgetPropertyMenuItemType;
  icon?: string;
  options?: WidgetPropertyMenuSelectorOption[];
  selectedOption?: string;
  isToggled?: boolean;
  href?: string;
  allowCustomColor?: boolean;
}

export type CodeBlockLanguage =
  | "TYPESCRIPT"
  | "CPP"
  | "RUBY"
  | "CSS"
  | "JAVASCRIPT"
  | "HTML"
  | "JSON"
  | "GRAPHQL"
  | "PYTHON"
  | "GO"
  | "SQL"
  | "SWIFT"
  | "KOTLIN"
  | "RUST"
  | "BASH"
  | "PLAINTEXT"
  | "MARKDOWN";

export type CodeBlockTheme =
  | "FIGJAM_DARK"
  | "DRACULA"
  | "DUOTONE_SEA"
  | "DUOTONE_SPACE"
  | "DUOTONE_EARTH"
  | "DUOTONE_FOREST"
  | "DUOTONE_LIGHT";

export type SpecBlockType =
  | "DEFAULT"
  | "PARAGRAPH"
  | "HEADING_1"
  | "HEADING_2"
  | "HEADING_3"
  | "HEADING_4"
  | "HEADING_5"
  | "HEADING_6"
  | "CODE_BLOCK"
  | "BLOCK_QUOTE"
  | "HORIZONTAL_RULE"
  | "ORDERED_LIST_ITEM"
  | "UNORDERED_LIST_ITEM"
  | "DOCUMENT"
  | "TABLE"
  | "TABLE_ROW"
  | "TABLE_CELL"
  | "TODO_LIST_ITEM_UNCHECKED"
  | "TODO_LIST_ITEM_CHECKED"
  | "IMAGE"
  | "EMBED"
  | "EMBEDDED_CANVAS";

export type InternalEnumForTest =
  | "OLD";

export interface InternalDataForTest {
  testFieldA?: number;
}

export interface StateGroupPropertyValueOrder {
  property?: string;
  values?: string[];
}

export type BackfillError =
  | "NONE"
  | "TRANSIENT_RETRYING"
  | "PERMANENTLY_FAILED"
  | "PASTE_FAILED";

export interface PartialPasteAnnotation {
  isPartial?: boolean;
  annotatedAt?: bigint;
  errorState?: BackfillError;
  upserted?: boolean;
}

export interface VariantPropSpec {
  propDefId?: GUID;
  value?: string;
}

export interface TextListData {
  listID?: number;
  bulletType?: BulletType;
  indentationLevel?: number;
  lineNumber?: number;
}

export type BulletType =
  | "ORDERED"
  | "UNORDERED"
  | "INDENT"
  | "NO_LIST";

export interface TextLineData {
  lineType?: LineType;
  styleId?: number;
  indentationLevel?: number;
  sourceDirectionality?: SourceDirectionality;
  directionality?: Directionality;
  directionalityIntent?: DirectionalityIntent;
  downgradeStyleId?: number;
  consistencyStyleId?: number;
  listStartOffset?: number;
  isFirstLineOfList?: boolean;
}

export interface DerivedTextLineData {
  directionality?: Directionality;
}

export type LineType =
  | "PLAIN"
  | "ORDERED_LIST"
  | "UNORDERED_LIST"
  | "BLOCKQUOTE"
  | "HEADER";

export type SourceDirectionality =
  | "AUTO"
  | "LTR"
  | "RTL";

export type Directionality =
  | "LTR"
  | "RTL";

export type DirectionalityIntent =
  | "IMPLICIT"
  | "EXPLICIT";

export interface PrototypeInteraction {
  id?: GUID;
  event?: PrototypeEvent;
  actions?: PrototypeAction[];
  isDeleted?: boolean;
  stateManagementVersion?: number;
}

export interface PrototypeEvent {
  interactionType?: InteractionType;
  interactionMaintained?: boolean;
  interactionDuration?: number;
  keyTrigger?: KeyTrigger;
  voiceEventPhrase?: string;
  transitionTimeout?: number;
  mediaHitTime?: number;
  transitionTimeoutVar?: VariableData;
}

export interface PrototypeVariableTarget {
  id?: VariableID;
  nodeFieldAlias?: NodeFieldAlias;
}

export interface ConditionalActions {
  actions?: PrototypeAction[];
  condition?: VariableData;
}

export interface PrototypeAction {
  transitionNodeID?: GUID;
  transitionType?: TransitionType;
  transitionDuration?: number;
  easingType?: EasingType;
  transitionDurationVar?: VariableData;
  easingVar?: VariableData;
  transitionTimeout?: number;
  transitionShouldSmartAnimate?: boolean;
  enableJitSmartAnimate?: boolean;
  interpolationColorSpace?: InterpolationColorSpace;
  interpolationHueMethod?: InterpolationHueMethod;
  connectionType?: ConnectionType;
  overlayRelativePosition?: Vector;
  navigationType?: NavigationType;
  transitionPreserveScroll?: boolean;
  easingFunction?: number[];
  extraScrollOffset?: Vector;
  transitionResetScrollPosition?: boolean;
  transitionResetInteractiveComponents?: boolean;
  transitionOverridesEnabled?: boolean;
  connectionURL?: string;
  openUrlInNewTab?: boolean;
  linkParam?: VariableData;
  cmsTarget?: CMSItemPageTarget;
  targetVariableID?: GUID;
  targetVariableValue?: VariableAnyValue;
  targetVariable?: PrototypeVariableTarget;
  targetVariableData?: VariableData;
  mediaAction?: MediaAction;
  transitionResetVideoPosition?: boolean;
  mediaSkipToTime?: number;
  mediaSkipByAmount?: number;
  mediaPlaybackRate?: number;
  conditions?: VariableData[];
  conditionalActions?: ConditionalActions[];
  targetVariableSetID?: VariableSetID;
  targetVariableModeID?: GUID;
  targetVariableSetKey?: string;
  variableSetTargetExtensionId?: VariableSetID;
  animationType?: AnimationType;
  animationTargetId?: GUID;
  animationPhase?: AnimationPhase;
  animationState?: AnimationState;
  simpleLink?: boolean;
  animationTimelineAction?: AnimationTimelineAction;
  animationTimelineDefId?: GUID;
  animationSkipToTime?: number;
}

export type AnimationPhase =
  | "IN"
  | "OUT";

export type AnimationType =
  | "NONE"
  | "FADE"
  | "SLIDE_FROM_LEFT"
  | "SLIDE_FROM_RIGHT"
  | "SLIDE_FROM_TOP"
  | "SLIDE_FROM_BOTTOM";

export interface AnimationState {
  opacity?: number;
  transform?: Matrix;
}

export interface PrototypeStartingPoint {
  name?: string;
  description?: string;
  position?: string;
}

export type TriggerDevice =
  | "KEYBOARD"
  | "UNKNOWN_CONTROLLER"
  | "XBOX_ONE"
  | "PS4"
  | "SWITCH_PRO";

export interface KeyTrigger {
  keyCodes?: number[];
  triggerDevice?: TriggerDevice;
}

export interface Hyperlink {
  url?: string;
  guid?: GUID;
  cmsTarget?: CMSItemPageTarget;
  openInNewTab?: boolean;
}

export interface CMSItemPageTarget {
  nodeId?: GUID;
  cmsItemId?: string;
  fieldSchemaId?: string;
}

export type MentionSource =
  | "DEFAULT"
  | "COPY_DUPLICATE"
  | "SILENT_INSERT";

export interface Mention {
  id?: GUID;
  mentionedUserId?: string;
  mentionedByUserId?: string;
  fileKey?: string;
  source?: MentionSource;
  mentionedUserIdInt?: bigint;
  mentionedByUserIdInt?: bigint;
  mentionedUserGroupId?: string;
}

export interface EmbedData {
  url?: string;
  srcUrl?: string;
  title?: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  embedType?: string;
  thumbnailImageHash?: string;
  faviconImageHash?: string;
  provider?: string;
  originalText?: string;
  description?: string;
  embedVersionId?: string;
  isPublishedSite?: boolean;
}

export interface StampData {
  userId?: string;
  votingSessionId?: string;
  stampedByUserId?: string;
}

export interface LinkPreviewData {
  url?: string;
  title?: string;
  provider?: string;
  description?: string;
  thumbnailImageHash?: string;
  faviconImageHash?: string;
  thumbnailImageWidth?: number;
  thumbnailImageHeight?: number;
}

export interface Viewport {
  canvasSpaceBounds?: Rect;
  pixelPreview?: boolean;
  pixelDensity?: number;
  canvasGuid?: GUID;
}

export interface Mouse {
  cursor?: MouseCursor;
  canvasSpaceLocation?: Vector;
  canvasSpaceSelectionBox?: Rect;
  canvasGuid?: GUID;
  cursorHiddenReason?: number;
}

export interface Click {
  id: number;
  point: Vector;
}

export interface ScrollPosition {
  node: GUID;
  scrollOffset: Vector;
}

export interface TriggeredOverlay {
  overlayGuid: GUID;
  hotspotGuid: GUID;
  swapGuid: GUID;
}

export interface TriggeredOverlayData {
  overlayGuid?: GUID;
  hotspotGuid?: GUID;
  swapGuid?: GUID;
  prototypeInteractionGuid?: GUID;
  hotspotBlueprintId?: GUIDPath;
}

export interface TriggeredSetVariableActionData {
  nodeForFindingTopmostScreenId?: GUID;
  targetVariableId?: string;
  targetVariableData?: string;
  resolvedVariableModes?: string;
}

export interface TriggeredSetVariableModeActionData {
  nodeForFindingTopmostScreenId?: GUID;
  targetVariableSetKey?: string;
  targetVariableModeId?: string;
  targetVariableSetId?: VariableSetID;
}

export interface VideoStateChangeData {
  targetNodeId?: GUID;
  isPlaying?: boolean;
  isPlayingSound?: boolean;
  currentTimes?: number[];
  actionTakenTimestamp?: number;
  playbackRate?: number;
}

export interface TimelinePlaybackStateData {
  status?: number;
  playbackTimeUs?: bigint;
  timelineRootId?: GUID;
  timelineDefId?: GUID;
  focusedSubtimelineRootId?: GUID;
}

export interface EmbeddedPrototypeData {
  nodeId?: GUID;
  sessionId?: number;
}

export interface PresentedState {
  baseScreenID?: GUID;
  overlays?: TriggeredOverlayData[];
}

export type TransitionDirection =
  | "FORWARD"
  | "REVERSE";

export interface TopLevelPlaybackChange {
  oldState?: PresentedState;
  newState?: PresentedState;
  hotspotBlueprintID?: GUIDPath;
  interactionID?: GUID;
  isHotspotInNewPresentedState?: boolean;
  direction?: TransitionDirection;
  instanceStablePath?: GUIDPath;
}

export interface InstanceStateChange {
  stateID?: GUID;
  interactionID?: GUID;
  hotspotStablePath?: GUIDPath;
  instanceStablePath?: GUIDPath;
  phase?: PlaybackChangePhase;
}

export interface TextCursor {
  selectionBox?: Rect;
  canvasGuid?: GUID;
  textNodeGuid?: GUID;
}

export interface TextSelection {
  selectionBoxes?: Rect[];
  canvasGuid?: GUID;
  textNodeGuid?: GUID;
  textSelectionRange?: Vector;
  textNodeOrContainingIfGuid?: GUID;
  tableCellRowId?: GUID;
  tableCellColId?: GUID;
}

export type PlaybackChangePhase =
  | "INITIATED"
  | "ABORTED"
  | "COMMITTED";

export interface PlaybackChangeKeyframe {
  phase?: PlaybackChangePhase;
  progress?: number;
  timestamp?: number;
}

export interface StateMapping {
  stablePath?: GUIDPath;
  lastTopLevelChange?: TopLevelPlaybackChange;
  lastTopLevelChangeStatus?: PlaybackChangeKeyframe;
  timestamp?: number;
}

export interface ScrollMapping {
  blueprintID?: GUIDPath;
  overlayIndex?: number;
  scrollOffset?: Vector;
}

export interface PlaybackUpdate {
  lastTopLevelChange?: TopLevelPlaybackChange;
  lastTopLevelChangeStatus?: PlaybackChangeKeyframe;
  scrollMappings?: ScrollMapping[];
  timestamp?: number;
  pointerLocation?: Vector;
  isTopLevelFrameChange?: boolean;
  stateMappings?: StateMapping[];
}

export interface ChatMessage {
  text?: string;
  previousText?: string;
}

export interface VoiceMetadata {
  connectedCallId?: string;
}

export interface AprilFunCursor {
  id?: string;
  trailEnabled?: boolean;
}

export interface AprilFunFigPal {
  customization?: string;
  name?: string;
}

export interface SanrioCharacter {
  character?: string;
}

export type Heartbeat =
  | "FOREGROUND"
  | "BACKGROUND";

export type SitesViewState =
  | "FILE"
  | "CODE"
  | "DAKOTA"
  | "SETTINGS"
  | "INSERT"
  | "VARIABLES";

export type DesignFullPageViewState =
  | "NONE"
  | "DESIGN_SYSTEM"
  | "VARIABLES";

export interface AgentInfo {
  name?: string;
  logo?: string;
  oauthClientId?: string;
}

export type AgentActivityStatus =
  | "RUNNING";

export interface AgentCanvasActivity {
  nodeIds?: GUID[];
  status?: AgentActivityStatus;
  triggeringUserId?: string;
}

export interface UserChange {
  sessionID?: number;
  stableSessionID?: string;
  connected?: boolean;
  name?: string;
  color?: Color;
  imageURL?: string;
  viewport?: Viewport;
  mouse?: Mouse;
  selection?: GUID[];
  observing?: number[];
  deviceName?: string;
  recentClicks?: Click[];
  scrollPositions?: ScrollPosition[];
  triggeredOverlays?: TriggeredOverlay[];
  userID?: string;
  lastTriggeredHotspot?: GUID;
  lastTriggeredPrototypeInteractionID?: GUID;
  lastTriggeredObjectAnimationIndex?: number;
  triggeredOverlaysData?: TriggeredOverlayData[];
  playbackUpdates?: PlaybackUpdate[];
  chatMessage?: ChatMessage;
  voiceMetadata?: VoiceMetadata;
  canWrite?: boolean;
  highFiveStatus?: boolean;
  instanceStateChanges?: InstanceStateChange[];
  textCursor?: TextCursor;
  textSelection?: TextSelection;
  connectedAtTimeS?: number;
  focusOnTextCursor?: boolean;
  heartbeat?: Heartbeat;
  triggeredSetVariableActionData?: TriggeredSetVariableActionData[];
  videoStateChangeData?: VideoStateChangeData[];
  clientID?: string;
  focusedSlideId?: GUID;
  triggeredSetVariableModeActionData?: TriggeredSetVariableModeActionData[];
  aprilFunCursor?: AprilFunCursor;
  embeddedPrototypeData?: EmbeddedPrototypeData[];
  activeSlidesEmbeddablePrototype?: GUID;
  activeEmbeddedPrototypes?: GUID[];
  activeCodeComponentId?: GUID;
  aprilFunFigPal?: AprilFunFigPal;
  collaborativeTextSelection?: CollaborativeTextSelection;
  sitesViewState?: SitesViewState;
  nodeChatExchanges?: NodeChatExchange[];
  designFullPageViewState?: DesignFullPageViewState;
  agentInfo?: AgentInfo;
  timelinePlaybackState?: TimelinePlaybackStateData[];
  agentCanvasActivity?: AgentCanvasActivity;
  assistantThreadId?: string;
  sanrioCharacter?: SanrioCharacter;
}

export interface InteractiveSlideElementChange {
  userID?: string;
  anonymousUserID?: string;
  nodeID?: GUID;
  responseData?: string;
}

export interface NodeStatusChange {
  nodeIds?: GUID[];
  statusInfo?: SectionStatusInfo;
}

export interface BuzzApprovalAssetEntry {
  assetNodeId?: GUID;
  approved?: boolean;
}

export interface BuzzApprovalChange {
  assetEntries?: BuzzApprovalAssetEntry[];
  canvasGridNodeId?: GUID;
  requestId?: string;
}

export type SceneGraphQueryBehavior =
  | "DEFAULT"
  | "CONTAINING_PAGE"
  | "PLUGIN";

export type SceneGraphQueryMode =
  | "ADD"
  | "SET";

export interface SceneGraphQuery {
  startingNode?: GUID;
  depth?: number;
  behavior?: SceneGraphQueryBehavior;
}

export interface NodeChangesMetadata {
  blobsFieldOffset?: number;
}

export interface CursorReaction {
  imageUrl?: string;
}

export interface TimerInfo {
  isPaused?: boolean;
  timeRemainingMs?: number;
  totalTimeMs?: number;
  timerID?: number;
  setBy?: string;
  songID?: number;
  lastReceivedSongTimestampMs?: number;
  songUUID?: string;
}

export interface MusicInfo {
  isPaused?: boolean;
  messageID?: number;
  songID?: string;
  lastReceivedSongTimestampMs?: number;
  isStopped?: boolean;
}

export interface PresenterNomination {
  sessionID?: number;
  isCancelled?: boolean;
}

export interface PresenterInfo {
  sessionID?: number;
  nomination?: PresenterNomination;
  isReconnected?: boolean;
}

export interface ClientBroadcast {
  sessionID?: number;
  cursorReaction?: CursorReaction;
  timer?: TimerInfo;
  presenter?: PresenterInfo;
  prototypePresenter?: PresenterInfo;
  music?: MusicInfo;
}

export type PasteAssetType =
  | "UNKNOWN"
  | "VARIABLE"
  | "STYLE_PROPERTIES"
  | "STYLE_PROPERTIES_FILL"
  | "STYLE_PROPERTIES_STROKE"
  | "STYLE_PROPERTIES_EFFECT";

export type NodeChangeOrder =
  | "GUID"
  | "PREORDER"
  | "TOPOLOGICAL";

export interface Message {
  type?: MessageType;
  sessionID?: number;
  stableSessionID?: string;
  ackID?: number;
  isRetransmission?: boolean;
  nodeChanges?: NodeChange[];
  userChanges?: UserChange[];
  interactiveSlideElementChange?: InteractiveSlideElementChange;
  nodeStatusChange?: NodeStatusChange;
  buzzApprovalChange?: BuzzApprovalChange;
  blobs?: Blob[];
  blobBaseIndex?: number;
  signalName?: string;
  access?: Access;
  styleSetName?: string;
  styleSetType?: StyleSetType;
  styleSetContentType?: StyleSetContentType;
  pasteID?: number;
  pasteOffset?: Vector;
  pasteFileKey?: string;
  signalPayload?: string;
  sceneGraphQueries?: SceneGraphQuery[];
  nodeChangesMetadata?: NodeChangesMetadata;
  fileVersion?: number;
  pasteIsPartiallyOutsideEnclosingFrame?: boolean;
  pastePageId?: GUID;
  isCut?: boolean;
  localUndoStack?: Message[];
  localRedoStack?: Message[];
  broadcasts?: ClientBroadcast[];
  reconnectSequenceNumber?: number;
  pasteBranchSourceFileKey?: string;
  pasteEditorType?: EditorType;
  postSyncActions?: string;
  publishedAssetGuids?: GUID[];
  dirtyFromInitialLoad?: boolean;
  clipboardSelectionRegions?: ClipboardSelectionRegion[];
  encodedOffsetsIndex?: EncodedOffsetsIndex;
  hasRepeatingContent?: boolean;
  sentTimestamp?: bigint;
  annotationCategories?: AnnotationCategory[];
  clientRenderedMetadata?: ClientRenderedMetadata;
  pasteAssetType?: PasteAssetType;
  objectAnimations?: ObjectAnimationList;
  sceneGraphQueryMode?: SceneGraphQueryMode;
  undoBatchPageIds?: GUID[];
  originFileKey?: string;
  nodeChangeOrder?: NodeChangeOrder;
}

export interface EncodedOffsetsIndex {
  nodeChangesFieldOffset?: number;
  nodeChangesFieldLength?: number;
  blobsFieldOffset?: number;
  nodeChangeOffsets?: GUIDAndEncodedOffset[];
}

export interface GUIDAndEncodedOffset {
  guid: GUID;
  offset: number;
}

export interface DiffChunk {
  nodeChanges?: number[];
  phase?: NodePhase;
  displayNode?: NodeChange;
  canvasId?: GUID;
  canvasName?: string;
  canvasIsInternal?: boolean;
  chunksAffectingThisChunk?: number[];
  basisParentHierarchy?: NodeChange[];
  parentHierarchy?: NodeChange[];
  basisParentHierarchyGuids?: GUID[];
  parentHierarchyGuids?: GUID[];
}

export type DiffType =
  | "BRANCHING"
  | "NODE_CHANGES_ONLY";

export interface DiffPayload {
  nodeChanges?: NodeChange[];
  blobs?: Blob[];
  diffChunks?: DiffChunk[];
  diffBasis?: NodeChange[];
  basisParentNodeChanges?: NodeChange[];
  parentNodeChanges?: NodeChange[];
  diffType?: DiffType;
}

export type RichMediaType =
  | "ANIMATED_IMAGE"
  | "VIDEO";

export interface RichMediaData {
  mediaHash?: string;
  richMediaType?: RichMediaType;
}

export type VariableDataType =
  | "BOOLEAN"
  | "FLOAT"
  | "STRING"
  | "ALIAS"
  | "COLOR"
  | "EXPRESSION"
  | "MAP"
  | "SYMBOL_ID"
  | "FONT_STYLE"
  | "TEXT_DATA"
  | "INVALID"
  | "NODE_FIELD_ALIAS"
  | "CMS_ALIAS"
  | "PROP_REF"
  | "IMAGE"
  | "MANAGED_STRING_ALIAS"
  | "LINK"
  | "JS_RUNTIME_ALIAS"
  | "SLOT_CONTENT_ID"
  | "DATE"
  | "KEYFRAME_TRACK_ID"
  | "KEYFRAME_TRACK_PARAMETER_DATA"
  | "EASING"
  | "TIMING"
  | "VECTOR"
  | "COLOR_ARRAY"
  | "LINE"
  | "CIRCLE"
  | "ROTATION_3D"
  | "CIRCLE_POINT"
  | "GRADIENT"
  | "COLOR_POINT"
  | "GRADIENT_PAINT"
  | "PAINT";

export type VariableResolvedDataType =
  | "BOOLEAN"
  | "FLOAT"
  | "STRING"
  | "COLOR"
  | "MAP"
  | "SYMBOL_ID"
  | "FONT_STYLE"
  | "TEXT_DATA"
  | "IMAGE"
  | "LINK"
  | "JS_RUNTIME_ALIAS"
  | "SLOT_CONTENT_ID"
  | "KEYFRAME_TRACK_ID"
  | "KEYFRAME_TRACK_PARAMETER_DATA"
  | "EASING"
  | "TIMING"
  | "VECTOR"
  | "COLOR_ARRAY"
  | "LINE"
  | "CIRCLE"
  | "ROTATION_3D"
  | "CIRCLE_POINT"
  | "GRADIENT"
  | "COLOR_POINT"
  | "GRADIENT_PAINT"
  | "PAINT";

export interface VariableAnyValue {
  boolValue?: boolean;
  textValue?: string;
  floatValue?: number;
  alias?: VariableID;
  colorValue?: Color;
  expressionValue?: Expression;
  mapValue?: VariableMap;
  symbolIdValue?: SymbolId;
  fontStyleValue?: VariableFontStyle;
  textDataValue?: TextData;
  nodeFieldAliasValue?: NodeFieldAlias;
  cmsAliasValue?: CMSAlias;
  propRefValue?: PropRefValue;
  imageValue?: ImageParameterValue;
  managedStringAliasValue?: ManagedStringAlias;
  linkValue?: Hyperlink;
  jsRuntimeAliasValue?: JsRuntimeAlias;
  slotContentIdValue?: SlotContentId;
  keyframeTrackIdValue?: KeyframeTrackId;
  keyframeTrackParameterValue?: KeyframeTrackParameterValue;
  easingValue?: EasingData;
  vectorValue?: Vector;
  colorArrayValue?: ColorArray;
  lineValue?: Line;
  circleValue?: Circle;
  rotation3DValue?: Rotation3D;
  circlePointValue?: CirclePoint;
  gradientValue?: Gradient;
  colorPointValue?: ColorPoint;
  gradientParameterValue?: GradientParameterValue;
  paintValue?: Paint;
}

export type ExpressionFunction =
  | "ADDITION"
  | "SUBTRACTION"
  | "RESOLVE_VARIANT"
  | "MULTIPLY"
  | "DIVIDE"
  | "EQUALS"
  | "NOT_EQUAL"
  | "LESS_THAN"
  | "LESS_THAN_OR_EQUAL"
  | "GREATER_THAN"
  | "GREATER_THAN_OR_EQUAL"
  | "AND"
  | "OR"
  | "NOT"
  | "STRINGIFY"
  | "TERNARY"
  | "VAR_MODE_LOOKUP"
  | "NEGATE"
  | "IS_TRUTHY"
  | "KEYFRAME"
  | "COMPOSE_COLOR"
  | "PAINT_TO_COLOR";

export interface Expression {
  expressionFunction?: ExpressionFunction;
  expressionArguments?: VariableData[];
}

export interface VariableMapValue {
  key?: string;
  value?: VariableData;
  guidKey?: GUID;
}

export interface VariableMap {
  values?: VariableMapValue[];
}

export interface ColorArray {
  colors?: VariableData[];
}

export interface VariableFontStyle {
  asString?: VariableData;
  asFloat?: VariableData;
  asVariations?: VariableData;
}

export interface ImageParameterValue {
  image?: Image;
  imageThumbnail?: Image;
  animatedImage?: Image;
  altText?: string;
  originalImageHeight?: number;
  originalImageWidth?: number;
  animationFrame?: number;
}

export interface ThumbnailInfo {
  nodeID?: GUID;
  thumbnailVersion?: string;
}

export interface AiCanvasPrompt {
  userPrompt?: string;
  authorId?: string;
  parentNodeIds?: GUID[];
}

export interface NodeFieldAlias {
  stablePathToNode?: GUIDPath;
  nodeField?: NodeFieldAliasType;
  indexOrKey?: string;
}

export type NodeFieldAliasType =
  | "MISSING"
  | "COMPONENT_PROP_ASSIGNMENTS";

export interface CMSAlias {
  collectionId?: string;
  itemId?: string;
  fieldId?: string;
  type?: VariableDataType;
}

export interface JsRuntimeAlias {
  lookupKey?: string;
}

export interface PropRefValue {
  defId?: GUID;
}

export interface ManagedStringId {
  guid?: GUID;
  assetRef?: AssetRef;
}

export interface ManagedStringPlaceholderMapEntry {
  key?: string;
  value?: string;
}

export interface SlotContentId {
  guid?: GUID;
}

export interface ManagedStringAlias {
  managedStringId?: ManagedStringId;
  placeholderValues?: ManagedStringPlaceholderMapEntry[];
}

export interface KeyframeTrackId {
  guid?: GUID;
  assetRef?: AssetRef;
}

export interface AnimationPresetId {
  guid?: GUID;
  assetRef?: AssetRef;
}

export interface ToolId {
  guid?: GUID;
  assetRef?: AssetRef;
}

export interface CustomEffectId {
  guid?: GUID;
  assetRef?: AssetRef;
}

export interface TRSSTransform2D {
  translation?: Vector;
  rotation?: number;
  scale?: Vector;
  shearX?: number;
}

export interface VariableData {
  value?: VariableAnyValue;
  dataType?: VariableDataType;
  resolvedDataType?: VariableResolvedDataType;
}

export interface VariableSetMode {
  id?: GUID;
  name?: string;
  sortPosition?: string;
  parentVariableSetId?: VariableSetID;
  parentModeId?: GUID;
}

export interface VariableDataValues {
  entries?: VariableDataValuesEntry[];
}

export interface VariableDataValuesEntry {
  modeID?: GUID;
  variableData?: VariableData;
}

export type VariableScope =
  | "ALL_SCOPES"
  | "TEXT_CONTENT"
  | "CORNER_RADIUS"
  | "WIDTH_HEIGHT"
  | "GAP"
  | "ALL_FILLS"
  | "FRAME_FILL"
  | "SHAPE_FILL"
  | "TEXT_FILL"
  | "STROKE"
  | "STROKE_FLOAT"
  | "EFFECT_FLOAT"
  | "EFFECT_COLOR"
  | "OPACITY"
  | "FONT_STYLE"
  | "FONT_FAMILY"
  | "FONT_SIZE"
  | "LINE_HEIGHT"
  | "LETTER_SPACING"
  | "PARAGRAPH_SPACING"
  | "PARAGRAPH_INDENT"
  | "FONT_VARIATIONS"
  | "TRANSFORM"
  | "COLOR_OPACITY";

export interface KeyframeAnyValue {
  floatValue?: number;
  colorValue?: Color;
  textDataValue?: TextData;
  vectorValue?: Vector;
  boolValue?: boolean;
  circleValue?: Circle;
  lineValue?: Line;
  circlePointValue?: CirclePoint;
  colorPointValue?: ColorPoint;
  gradientParameterValue?: GradientParameterValue;
  paintValue?: Paint;
}

export type KeyframeValueType =
  | "FLOAT"
  | "INVALID"
  | "COLOR"
  | "TEXT_DATA"
  | "VECTOR"
  | "BOOL"
  | "CIRCLE"
  | "LINE"
  | "CIRCLE_POINT"
  | "COLOR_POINT"
  | "GRADIENT_PAINT"
  | "PAINT";

export interface KeyframeValueData {
  value?: KeyframeAnyValue;
  valueType?: KeyframeValueType;
}

export type KeyframeTrackParameterType =
  | "INVALID"
  | "MANUAL"
  | "ANIMATION_PRESET";

export interface ManualKeyframeTrackParameter {
  keyframeTrackId?: KeyframeTrackId;
  timelineDefId?: GUID;
}

export interface AnimationPresetKeyframeTrackParameter {
  animationPresetId?: AnimationPresetId;
  keyframeTrackId?: KeyframeTrackId;
  timelineDefId?: GUID;
}

export interface KeyframeTrackAnyParameter {
  manual?: ManualKeyframeTrackParameter;
  animationPreset?: AnimationPresetKeyframeTrackParameter;
  animationStyleBindingId?: GUID;
}

export interface KeyframeTrackParameter {
  value?: KeyframeTrackAnyParameter;
  type?: KeyframeTrackParameterType;
}

export interface KeyframeTrackParameterValue {
  parameters?: KeyframeTrackParameter[];
}

export interface AnimationPresets {
  presets?: AnimationPresetData[];
}

export interface AnimationPresetData {
  animationPresetId?: AnimationPresetId;
  timelineDefId?: GUID;
  sortPosition?: string;
}

export interface StyleAnimation {
  animationPresetId?: AnimationPresetId;
}

export interface StyleIdForAnimation {
  id?: GUID;
  timelineDefId?: GUID;
  animationStyleId?: StyleId;
  timelineOffset?: bigint;
  generatedAnimationPresets?: GeneratedAnimationPreset[];
  sortPosition?: string;
}

export interface GeneratedAnimationPreset {
  animationPresetId?: AnimationPresetId;
}

export interface Tools {
  tools?: ToolData[];
}

export interface ToolData {
  toolId?: ToolId;
  backingCodeComponentId?: CodeComponentId;
  componentPropAssignments?: ComponentPropAssignment[];
}

export type SpringType =
  | "NORMALIZED"
  | "PHYSICAL";

export interface SpringParams {
  stiffness?: number;
  damping?: number;
  mass?: number;
  springType?: SpringType;
}

export interface TransitionEasingAnyValue {
  springEasing?: SpringParams;
  bezierEasing?: BezierHandles;
}

export interface EasingData {
  easingType?: EasingType;
  easingValue?: TransitionEasingAnyValue;
}

export interface TransitionOverride {
  id?: GUID;
  duration?: number;
  durationVar?: VariableData;
  delay?: number;
  delayVar?: VariableData;
  easing?: EasingData;
  easingVar?: VariableData;
  createdAtMs?: bigint;
  interactionIDs?: GUID[];
  disabled?: boolean;
}

export interface TransitionOverrideData {
  all?: TransitionOverride[];
  propertyOverrides?: TransitionOverridePropMap;
}

export type TransitionOverrideProp =
  | "ALL"
  | "OPACITY"
  | "TRANSLATION"
  | "ROTATION"
  | "SCALE";

export type TransitionOverrideBindingTopLevelField =
  | "MISSING"
  | "PARAMETER_CONSUMPTION_MAP"
  | "EFFECT_DATA"
  | "FILL_PAINT_DATA"
  | "STROKE_PAINT_DATA";

export interface TransitionOverrideBindingLocation {
  topLevelField?: TransitionOverrideBindingTopLevelField;
  parameterFieldValue?: number;
  index?: number;
  effectParametrizedFieldValue?: number;
}

export type KeyframeBindingEffectParametrizedField =
  | "MISSING"
  | "OFFSET_X"
  | "OFFSET_Y"
  | "RADIUS"
  | "SPREAD"
  | "COLOR"
  | "REFRACTION_RADIUS"
  | "SPECULAR_ANGLE"
  | "SPECULAR_INTENSITY"
  | "CHROMATIC_ABERRATION"
  | "SPLAY"
  | "REFRACTION_INTENSITY"
  | "START_RADIUS"
  | "START_OFFSET_X"
  | "START_OFFSET_Y"
  | "END_OFFSET_X"
  | "END_OFFSET_Y"
  | "NOISE_SIZE_X"
  | "NOISE_SIZE_Y"
  | "DENSITY"
  | "EFFECT_OPACITY"
  | "SECONDARY_COLOR";

export interface NodeContentsKeyframeBindingLocation {
  topLevelField?: TransitionOverrideBindingTopLevelField;
  parameterFieldValue?: VariableField;
  index?: number;
  effectParametrizedFieldValue?: KeyframeBindingEffectParametrizedField;
}

export interface TransitionOverridePropMap {
  entries?: TransitionOverridePropMapEntry[];
}

export interface TransitionOverridePropMapEntry {
  prop?: TransitionOverrideProp;
  overrides?: TransitionOverride[];
  bindingLocation?: TransitionOverrideBindingLocation;
  nodeContentsBindingLocation?: NodeContentsKeyframeBindingLocation;
}

export type CodeSyntaxPlatform =
  | "WEB"
  | "ANDROID"
  | "iOS";

export interface OptionalVector {
  value?: Vector;
}

export type HTMLTag =
  | "AUTO"
  | "ARTICLE"
  | "SECTION"
  | "NAV"
  | "ASIDE"
  | "H1"
  | "H2"
  | "H3"
  | "H4"
  | "H5"
  | "H6"
  | "HGROUP"
  | "HEADER"
  | "FOOTER"
  | "ADDRESS"
  | "P"
  | "HR"
  | "PRE"
  | "BLOCKQUOTE"
  | "OL"
  | "UL"
  | "MENU"
  | "LI"
  | "DL"
  | "DT"
  | "DD"
  | "FIGURE"
  | "FIGCAPTION"
  | "MAIN"
  | "DIV"
  | "A"
  | "EM"
  | "STRONG"
  | "SMALL"
  | "S"
  | "CITE"
  | "Q"
  | "DFN"
  | "ABBR"
  | "RUBY"
  | "RT"
  | "RP"
  | "DATA"
  | "TIME"
  | "CODE"
  | "VAR"
  | "SAMP"
  | "KBD"
  | "SUB"
  | "SUP"
  | "I"
  | "B"
  | "U"
  | "MARK"
  | "BDI"
  | "BDO"
  | "SPAN"
  | "BR"
  | "WBR"
  | "PICTURE"
  | "SOURCE"
  | "IMG"
  | "FORM"
  | "LABEL"
  | "INPUT"
  | "BUTTON"
  | "SELECT"
  | "DATALIST"
  | "OPTGROUP"
  | "OPTION"
  | "TEXTAREA"
  | "OUTPUT"
  | "PROGRESS"
  | "METER"
  | "FIELDSET"
  | "LEGEND"
  | "VIDEO";

export type ARIARole =
  | "AUTO"
  | "NONE"
  | "APPLICATION"
  | "BANNER"
  | "COMPLEMENTARY"
  | "CONTENTINFO"
  | "FORM"
  | "MAIN"
  | "NAVIGATION"
  | "REGION"
  | "SEARCH"
  | "SEPARATOR"
  | "ARTICLE"
  | "COLUMNHEADER"
  | "DEFINITION"
  | "DIRECTORY"
  | "DOCUMENT"
  | "GROUP"
  | "HEADING"
  | "IMG"
  | "LIST"
  | "LISTITEM"
  | "MATH"
  | "NOTE"
  | "PRESENTATION"
  | "ROW"
  | "ROWGROUP"
  | "ROWHEADER"
  | "TABLE"
  | "TOOLBAR"
  | "BUTTON"
  | "CHECKBOX"
  | "GRIDCELL"
  | "LINK"
  | "MENUITEM"
  | "MENUITEMCHECKBOX"
  | "MENUITEMRADIO"
  | "OPTION"
  | "PROGRESSBAR"
  | "RADIO"
  | "SCROLLBAR"
  | "SLIDER"
  | "SPINBUTTON"
  | "TAB"
  | "TABPANEL"
  | "TEXTBOX"
  | "TREEITEM"
  | "COMBOBOX"
  | "GRID"
  | "LISTBOX"
  | "MENU"
  | "MENUBAR"
  | "RADIOGROUP"
  | "TABLIST"
  | "TREE"
  | "TREEGRID"
  | "TOOLTIP"
  | "ALERT"
  | "LOG"
  | "MARQUEE"
  | "STATUS"
  | "TIMER"
  | "ALERTDIALOG"
  | "DIALOG"
  | "SEARCHBOX"
  | "SWITCH"
  | "BLOCKQUOTE"
  | "CAPTION"
  | "CELL"
  | "DELETION"
  | "EMPHASIS"
  | "FEED"
  | "FIGURE"
  | "GENERIC"
  | "INSERTION"
  | "METER"
  | "PARAGRAPH"
  | "STRONG"
  | "SUBSCRIPT"
  | "SUPERSCRIPT"
  | "TERM"
  | "TIME"
  | "IMAGE"
  | "HEADING_1"
  | "HEADING_2"
  | "HEADING_3"
  | "HEADING_4"
  | "HEADING_5"
  | "HEADING_6"
  | "HEADER"
  | "FOOTER"
  | "SIDEBAR"
  | "SECTION"
  | "MAINCONTENT"
  | "TABLE_CELL"
  | "WIDGET";

export interface MigrationStatus {
  dsdCleanup?: boolean;
}

export interface NodeFieldMap {
  entries?: NodeFieldMapEntry[];
}

export interface NodeFieldMapEntry {
  guid?: GUID;
  field?: number;
  lastModifiedSequenceNumber?: number;
}

export type ColorProfile =
  | "SRGB"
  | "DISPLAY_P3";

export type DocumentColorProfile =
  | "LEGACY"
  | "SRGB"
  | "DISPLAY_P3";

export type ChildReadingDirection =
  | "NONE"
  | "LEFT_TO_RIGHT"
  | "RIGHT_TO_LEFT";

export interface ARIAAttributeAnyValue {
  boolValue?: boolean;
  stringValue?: string;
  floatValue?: number;
  intValue?: number;
  stringArrayValue?: string[];
}

export type ARIAAttributeDataType =
  | "BOOLEAN"
  | "STRING"
  | "FLOAT"
  | "INT"
  | "STRING_LIST";

export interface ARIAAttributeData {
  type?: ARIAAttributeDataType;
  value?: ARIAAttributeAnyValue;
}

export interface ARIAAttributesMap {
  entries?: ARIAAttributesMapEntry[];
}

export interface ARIAAttributesMapEntry {
  attribute?: string;
  value?: ARIAAttributeData;
}

export interface HandoffStatusMapEntry {
  guid?: GUID;
  handoffStatus?: SectionStatusInfo;
}

export interface HandoffStatusMap {
  entries?: HandoffStatusMapEntry[];
}

export interface EditScopeInfo {
  editScopeStacks?: EditScopeStack[];
  snapshots?: EditScopeSnapshot[];
}

export interface EditScopeSnapshot {
  frames?: EditScopeStack[];
  nodeChangeFieldNumbers?: number[];
}

export interface EditScopeStack {
  stack?: EditScope[];
}

export interface EditScope {
  type?: EditScopeType;
  label?: string;
  editorType?: EditorType;
}

export type EditScopeType =
  | "INVALID"
  | "TEST_SETUP"
  | "USER"
  | "PLUGIN"
  | "SYSTEM"
  | "REST_API"
  | "ONBOARDING"
  | "AUTOSAVE"
  | "AI";

export type SectionPresetState =
  | "INSERTED"
  | "USER_EDITED";

export type EmojiImageSet =
  | "APPLE"
  | "NOTO";

export type SelectionRegionFocusType =
  | "NONE"
  | "PRIMARY"
  | "SECONDARY";

export interface SectionPresetInfo {
  shelfId?: bigint;
  templateId?: bigint;
  templateName?: string;
  state?: SectionPresetState;
}

export interface ClipboardTextRange {
  start?: number;
  end?: number;
}

export interface ClipboardSelectionRegion {
  parent?: GUID;
  nodes?: GUID[];
  enclosingFrameOffset?: Vector;
  pasteIsPartiallyOutsideEnclosingFrame?: boolean;
  focusType?: SelectionRegionFocusType;
  textRange?: ClipboardTextRange;
}

export type FirstDraftKitType =
  | "LOCAL"
  | "LIBRARY"
  | "NONE";

export interface FirstDraftKit {
  key?: string;
  type?: FirstDraftKitType;
}

export interface FirstDraftData {
  generationId?: string;
  kit?: FirstDraftKit;
}

export type FirstDraftKitElementType =
  | "NONE"
  | "BUILDING_BLOCK"
  | "GROUPED_COMPONENT";

export interface FirstDraftKitElementData {
  type?: FirstDraftKitElementType;
}

export type PlatformShapeProperty =
  | "FILL"
  | "STROKE"
  | "TEXT"
  | "STROKE_COLOR";

export type PlatformShapeBehaviorType =
  | "SHAPE"
  | "CONTAINER"
  | "ADVANCED_CONTAINER";

export interface PlatformShapePropertyMapEntry {
  property?: PlatformShapeProperty;
  nodePaths?: GUIDPath[];
}

export interface PlatformShapeDefinition {
  propertyMapEntries?: PlatformShapePropertyMapEntry[];
  behaviorType?: PlatformShapeBehaviorType;
  thumbnailNode?: GUIDPath;
}

export interface NodeBehaviors {
  link?: LinkBehavior;
  appear?: AppearBehavior;
  hover?: HoverBehavior;
  press?: PressBehavior;
  focus?: FocusBehavior;
  scrollParallax?: ScrollParallaxBehavior;
  scrollTransform?: ScrollTransformBehavior;
  cursor?: CursorBehavior;
  marquee?: MarqueeBehavior;
  code?: CodeBehavior[];
}

export interface BehaviorTransition {
  easingType?: EasingType;
  easingFunction?: number[];
  transitionDuration?: number;
  delay?: number;
  transitionDurationVar?: VariableData;
  delayVar?: VariableData;
}

export type AppearBehaviorTrigger =
  | "PAGE_LOAD"
  | "THIS_LAYER_IN_VIEW"
  | "OTHER_LAYER_IN_VIEW"
  | "SCROLL_DIRECTION";

export type RelativeDirection =
  | "UP"
  | "DOWN"
  | "LEFT"
  | "RIGHT";

export interface AppearBehavior {
  trigger?: AppearBehaviorTrigger;
  direction?: RelativeDirection;
  otherLayer?: GUID;
  enterTransition?: BehaviorTransition;
  enterState?: NodeChange;
  exitTransition?: BehaviorTransition;
  exitState?: NodeChange;
  playsOnce?: boolean;
  playsOnceVar?: VariableData;
  isDeleted?: boolean;
}

export interface HoverBehavior {
  transition?: BehaviorTransition;
  state?: NodeChange;
  isDeleted?: boolean;
}

export interface PressBehavior {
  transition?: BehaviorTransition;
  state?: NodeChange;
  isDeleted?: boolean;
}

export interface FocusBehavior {
  transition?: BehaviorTransition;
  state?: NodeChange;
  isDeleted?: boolean;
}

export interface ScrollParallaxBehavior {
  axis?: ScrollDirection;
  speed?: number;
  relativeToPage?: boolean;
  speedVar?: VariableData;
  isDeleted?: boolean;
}

export type ScrollTransformBehaviorTrigger =
  | "PAGE_HEIGHT"
  | "THIS_LAYER_IN_VIEW"
  | "OTHER_LAYER_IN_VIEW";

export interface ScrollTransformBehavior {
  trigger?: ScrollTransformBehaviorTrigger;
  otherLayer?: GUID;
  transition?: BehaviorTransition;
  fromState?: NodeChange;
  toState?: NodeChange;
  playsOnce?: boolean;
  playsOnceVar?: boolean;
  playsOnceVar2?: VariableData;
  isDeleted?: boolean;
}

export interface CursorBehavior {
  hotspotX?: number;
  hotspotY?: number;
  cursorGuid?: GUID;
  isDeleted?: boolean;
}

export interface MarqueeBehavior {
  direction?: RelativeDirection;
  speed?: number;
  shouldLoopInfinitely?: boolean;
  speedVar?: VariableData;
  shouldLoopInfinitelyVar?: VariableData;
  pauseOnHover?: VariableData;
  isDeleted?: boolean;
}

export interface CodeBehavior {
  codeComponentId?: CodeComponentId;
  componentPropAssignments?: ComponentPropAssignment[];
  isDeleted?: boolean;
}

export interface ClientRenderedMetadata {
  loadID?: string;
  trackingSessionId?: string;
  trackingSessionSequenceId?: number;
  reconnectID?: string;
}

export interface CustomEffects {
  customEffects?: CustomEffectData[];
}

export interface CustomEffectData {
  customEffectId?: CustomEffectId;
}

export type LinkBehaviorType =
  | "URL"
  | "PAGE";

export interface LinkBehavior {
  type?: LinkBehaviorType;
  url?: string;
  page?: GUID;
  openInNewWindow?: boolean;
}

export interface VariableIdOrVariableOverrideId {
  variableId?: VariableID;
  variableOverrideId?: VariableOverrideId;
}

export interface IndexFontVariationAxis {
  tag: string;
  name: string;
  min: number;
  max: number;
  defaultValue: number;
}

export interface IndexFontVariationAxisValue {
  tag: string;
  value: number;
}

export interface IndexFontStyle {
  name?: string;
  postscript?: string;
  weight?: number;
  italic?: boolean;
  stretch?: number;
  variationAxisValues?: IndexFontVariationAxisValue[];
}

export interface IndexFontFile {
  filename?: string;
  version?: number;
  family?: string;
  styles?: IndexFontStyle[];
  variationAxes?: IndexFontVariationAxis[];
  useFontOpticalSize?: boolean;
}

export interface IndexFamilyRename {
  oldFamily: string;
  newFamily: string;
}

export interface IndexStyleRename {
  oldStyle: string;
  newStyle: string;
}

export interface IndexFamilyStylesRename {
  familyName: string;
  styleRenames: IndexStyleRename[];
}

export interface IndexRenames {
  family: IndexFamilyRename[];
  style: IndexFamilyStylesRename[];
}

export interface IndexEmojiSequence {
  codepoints: number[];
}

export interface IndexEmojis {
  revision: number;
  sizes: number[];
  sequences: IndexEmojiSequence[];
}

export interface FontIndex {
  schemaVersion?: number;
  files?: IndexFontFile[];
  renames?: IndexRenames;
  emojis?: IndexEmojis;
}

export interface SlideThemeData {
  themeID?: ThemeID;
  version?: string;
}

export type SlideNumber =
  | "NONE"
  | "SLIDE"
  | "SECTION"
  | "SUBSECTION"
  | "TOTAL_WITHIN_DECK"
  | "TOTAL_WITHIN_SECTION";

export type NodeChatMessageType =
  | "USER_MESSAGE"
  | "ASSISTANT_MESSAGE"
  | "TOOL_MESSAGE"
  | "SYSTEM_MESSAGE";

export interface NodeChatMessage {
  id?: GUID;
  type?: NodeChatMessageType;
  userId?: string;
  textContent?: string;
  sentAt?: number;
  toolCalls?: NodeChatToolCall[];
  toolResults?: NodeChatToolResult[];
  sentAt64?: bigint;
}

export interface NodeChatToolCall {
  toolCallId?: string;
  toolName?: string;
  argsJson?: string;
}

export interface NodeChatToolResult {
  toolCallId?: string;
  toolName?: string;
  resultJson?: string;
}

export interface NodeChatExchange {
  node?: GUID;
  messages?: NodeChatMessage[];
  isTyping?: boolean;
  fileUpdates?: FileUpdate[];
}

export interface NodeChatCompressionState {
  startIndex?: number;
  summary?: string;
}

export interface FileUpdate {
  name?: string;
  contents?: string;
  isDeleted?: boolean;
}

export interface AIChatContentPart {
  type?: AIChatContentPartType;
  value?: AIChatContentPartAnyValue;
}

export type AIChatContentPartType =
  | "INVALID"
  | "TEXT"
  | "SELECTED_NODE_IDS";

export interface AIChatContentPartAnyValue {
  textValue?: string;
  selectedNodeIds?: string[];
}

export type AIChatMessageRole =
  | "USER"
  | "ASSISTANT"
  | "TOOL"
  | "SYSTEM";

export interface AIChatMessage {
  createdAtMs?: number;
  role?: AIChatMessageRole;
  content?: AIChatContentPart[];
  clientId?: string;
  createdAtMs64?: bigint;
}

export interface AIChatThread {
  messages?: AIChatMessage[];
}

export type CooperTemplateType =
  | "CUSTOM"
  | "TWITTER_POST"
  | "LINKEDIN_POST"
  | "INSTA_POST_SQUARE"
  | "INSTA_POST_PORTRAIT"
  | "INSTA_STORY"
  | "INSTA_AD"
  | "FACEBOOK_POST"
  | "FACEBOOK_COVER_PHOTO"
  | "FACEBOOK_EVENT_COVER"
  | "FACEBOOK_AD_PORTRAIT"
  | "FACEBOOK_AD_SQUARE"
  | "PINTEREST_AD_PIN"
  | "TWITTER_BANNER"
  | "LINKEDIN_POST_SQUARE"
  | "LINKEDIN_POST_PORTRAIT"
  | "LINKEDIN_POST_LANDSCAPE"
  | "LINKEDIN_PROFILE_BANNER"
  | "LINKEDIN_ARTICLE_BANNER"
  | "LINKEDIN_AD_LANDSCAPE"
  | "LINKEDIN_AD_SQUARE"
  | "LINKEDIN_AD_VERTICAL"
  | "YOUTUBE_THUMBNAIL"
  | "YOUTUBE_BANNER"
  | "YOUTUBE_AD"
  | "TWITCH_BANNER"
  | "GOOGLE_LEADERBOARD_AD"
  | "GOOGLE_LARGE_AD"
  | "GOOGLE_MED_AD"
  | "GOOGLE_MOBILE_BANNER_AD"
  | "GOOGLE_SKYSCRAPER_AD"
  | "CARD_HORIZONTAL"
  | "CARD_VERTICAL"
  | "PRINT_US_LETTER"
  | "POSTER"
  | "BANNER_STANDARD"
  | "BANNER_WIDE"
  | "BANNER_ULTRAWIDE"
  | "NAME_TAG_PORTRAIT"
  | "NAME_TAG_LANDSCAPE"
  | "INSTA_REEL_COVER"
  | "ZOOM_BACKGROUND"
  | "TIKTOK_POST"
  | "INSTA_AD_PORTRAIT"
  | "INSTA_POST_TALL_PORTRAIT"
  | "TWITTER_POST_SQUARE"
  | "FACEBOOK_POST_SQUARE"
  | "FACEBOOK_POST_PORTRAIT"
  | "FACEBOOK_STORY"
  | "GOOGLE_SQUARE_AD"
  | "GOOGLE_SMALL_SQUARE_AD"
  | "GOOGLE_NARROW_SKYSCRAPER_AD"
  | "GOOGLE_HALF_PAGE_AD"
  | "GOOGLE_LARGE_LEADERBOARD_AD"
  | "GOOGLE_BILLBOARD_AD"
  | "GOOGLE_BANNER_LEADERBOARD_AD"
  | "GOOGLE_TOP_BANNER_AD"
  | "GOOGLE_MOBILE_LEADERBOARD_BANNER_AD"
  | "GOOGLE_LARGE_MOBILE_BANNER_AD"
  | "GOOGLE_MOBILE_INTERSTITIAL_AD"
  | "GOOGLE_MOBILE_MED_RECTANGLE_AD"
  | "PINTEREST_PIN_STANDARD"
  | "PINTEREST_PIN_SQUARE"
  | "PINTEREST_AD_SQUARE"
  | "PRINT_A4";

export interface CooperTemplateData {
  type?: CooperTemplateType;
}

export interface ImageImportMap {
  imports?: ImageImport[];
}

export interface ImageImport {
  name?: string;
  image?: Image;
}

export interface FrameRate {
  numerator?: number;
  denominator?: number;
}

export type InterpolationType =
  | "HOLD"
  | "BEZIER"
  | "SPRING";

export interface BezierHandles {
  p1x?: number;
  p1y?: number;
  p2x?: number;
  p2y?: number;
}

export type KeyframeOperation =
  | "SET"
  | "SCALE"
  | "OFFSET";

export type TimelinePositionType =
  | "ABSOLUTE"
  | "RELATIVE";

export type PlaybackStyle =
  | "ONCE"
  | "LOOP"
  | "BOOMERANG";

export type TrackLoopMode =
  | "NONE"
  | "LOOP";

export interface AudioFill {
  id?: GUID;
  mediaHash?: string;
  timelineOffsetUs?: bigint;
  startTimeUs?: bigint;
  durationUs?: bigint;
  volume?: number;
  mute?: boolean;
  displayName?: string;
  loopEnabled?: boolean;
  playbackDurationUs?: bigint;
  trackId?: GUID;
  loopPhaseOffsetUs?: bigint;
}

export interface AudioTrack {
  id?: GUID;
  name?: string;
  gain?: number;
  mute?: boolean;
}
