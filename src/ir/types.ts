/**
 * The design IR: a file described the way a front end is built — screens,
 * layout, tokens, components, interactions and assets — rather than the way
 * Figma stores it.
 *
 * Conventions:
 * - Lengths are CSS pixels at the design's size.
 * - Colours are CSS hex strings, `#rrggbb` or `#rrggbbaa`. A paint's opacity
 *   is folded into the alpha.
 * - Times are milliseconds.
 * - Fields at their default are left out: an absent `opacity` is 1, an absent
 *   `layout` means children are placed absolutely, and so on.
 */

export interface DesignIR {
  /** Bumped when a field changes meaning. */
  version: 1;
  name: string;
  pages: IRPage[];
  /** Components and component sets by id. */
  components: Record<string, IRComponent>;
  tokens: IRTokens;
  /** Shared styles by id. */
  styles: Record<string, IRStyle>;
  assets: IRAssets;
}

export interface IRPage {
  id: string;
  name: string;
  background: string;
  /** Top-level frames, and the frames directly inside top-level sections. */
  screens: IRScreen[];
  /** Prototype flows: where each starts. */
  flows: Array<{ name: string; screen: string; description?: string }>;
}

export interface IRScreen {
  id: string;
  name: string;
  /** The section the screen sits in, outermost first. */
  section?: string[];
  root: IRNode;
}

export type IRNodeType =
  | "frame"
  | "group"
  | "instance"
  | "component"
  | "componentSet"
  | "text"
  | "rectangle"
  | "ellipse"
  | "line"
  | "vector"
  /** A rectangle, or a frame without children, filled by a single image: an `<img>`. */
  | "image"
  /** Drawn from `assets.svgs[asset]`: an icon or other vector artwork. */
  | "svg"
  | "section";

export interface IRNode {
  id: string;
  name: string;
  type: IRNodeType;
  /**
   * Only hidden nodes a component property can show are kept, with
   * `visible: false`; other hidden nodes are dropped.
   */
  visible?: false;

  /** The node's own, untransformed box, positioned in its parent's box. */
  x: number;
  y: number;
  width: number;
  height: number;
  /**
   * The linear part of the node's transform when it is rotated or flipped:
   * CSS `transform-origin: 0 0; transform: matrix(a, b, c, d, 0, 0)` applied
   * at (x, y).
   */
  transform?: [a: number, b: number, c: number, d: number];
  /** Rotation in degrees, clockwise, for reading; `transform` is exact. */
  rotation?: number;
  /**
   * With `transform`: the bounding box of the transformed node in its
   * parent's box — where it shows, and the box Figma's auto layout gives it.
   */
  bounds?: { x: number; y: number; width: number; height: number };

  // -- In its parent --
  /** Placed absolutely inside an auto-layout parent. */
  absolute?: true;
  /** How the node follows its parent's resizing when placed absolutely. Absent: left and top. */
  constraints?: { horizontal?: IRConstraint; vertical?: IRConstraint };
  /** Absent axes are fixed. `fill` stretches in an auto-layout parent; `hug` sizes to content. */
  sizing?: { horizontal?: "hug" | "fill"; vertical?: "hug" | "fill" };
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  /** Cell of a grid parent, zero-based. */
  gridCell?: { row: number; column: number; rowSpan?: number; columnSpan?: number; alignH?: IRAlign; alignV?: IRAlign };

  // -- As a container --
  /** Absent: children are placed absolutely at their x and y. */
  layout?: IRFlexLayout | IRGridLayout;
  /** Clips its content. */
  clip?: true;
  /** Scrolls its overflow in the prototype. */
  scroll?: "x" | "y" | "both";
  /** Stays put while its scrolling parent scrolls. */
  scrollBehavior?: "fixed" | "sticky";

  // -- Appearance --
  opacity?: number;
  blendMode?: string;
  fills?: IRPaint[];
  stroke?: IRStroke;
  /** One radius, or top-left, top-right, bottom-right, bottom-left. */
  radius?: number | [number, number, number, number];
  /** iOS-style corner smoothing, 0..1. */
  cornerSmoothing?: number;
  effects?: IREffect[];
  /** This node masks its later siblings. */
  mask?: "alpha" | "vector" | "luminance";
  /** For `ellipse`: an arc or ring. Angles in radians. */
  arc?: { start: number; end: number; innerRadius: number };

  text?: IRText;

  /** For `instance`: what it is an instance of. */
  component?: IRInstanceOf;
  /** Component properties this layer's fields follow, by field: `characters`, `visible`, `mainComponent`. */
  propRefs?: Record<string, string>;

  /** Shared styles the node uses, by kind, as ids into `DesignIR.styles`. */
  styles?: { fill?: string; stroke?: string; text?: string; effect?: string; grid?: string };
  /**
   * Tokens bound to fields, by IR field (`width`, `gap`, `padding.top`,
   * `radius.topLeft`, `opacity`, `text.fontSize`, `characters`, `visible` ...).
   * Colours carry their token on the paint itself.
   */
  tokens?: Record<string, string>;
  /** Variable modes set on this node, by collection name: what a theme switch changes. */
  modes?: Record<string, string>;

  interactions?: IRInteraction[];
  /**
   * The key into `assets.svgs` the node is drawn from; its children are left
   * out. Set on `svg` nodes, and on instances and components of icons.
   */
  asset?: string;
  /** Export settings: the designer marked this layer as a deliverable asset. */
  exports?: Array<{ format: string; suffix?: string; scale?: number }>;

  children?: IRNode[];
}

export type IRConstraint = "start" | "end" | "both" | "center" | "scale";
export type IRAlign = "auto" | "start" | "center" | "end";

export interface IRFlexLayout {
  type: "flex";
  direction: "row" | "column";
  /** Gap between items; absent with `justify: "space-between"`, where it is automatic. */
  gap?: number;
  wrap?: true;
  /** Gap between wrapped lines. */
  lineGap?: number;
  justify?: "center" | "end" | "space-between";
  align?: "center" | "end" | "baseline";
  alignContent?: "space-between";
  padding?: IRPadding;
  /** Earlier items are drawn on top. */
  reverseZ?: true;
  /** Borders take up space, like CSS `box-sizing: border-box` borders; otherwise they overlay. */
  strokesInLayout?: true;
}

export interface IRGridLayout {
  type: "grid";
  /** CSS track lists. */
  rows: string;
  columns: string;
  rowGap?: number;
  columnGap?: number;
  padding?: IRPadding;
}

export interface IRPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type IRPaint =
  | { type: "solid"; color: string; token?: string; blendMode?: string }
  | IRGradient
  | IRImagePaint
  | { type: "video" | "pattern" | "other"; blendMode?: string };

export interface IRGradient {
  type: "linear" | "radial" | "angular" | "diamond";
  stops: Array<{ color: string; position: number; token?: string }>;
  /**
   * The gradient as CSS, for the node's box. Diamond gradients are
   * approximated by a radial one.
   */
  css: string;
  /** Handle positions in the node's box, 0..1, as Figma stores them. */
  handles: Array<{ x: number; y: number }>;
  blendMode?: string;
}

export interface IRImagePaint {
  type: "image";
  /** The image's hash: the key into `assets.images`. */
  image: string;
  /** `cover`, `contain`, a `crop` of the image, or `tile`. */
  fit: "cover" | "contain" | "crop" | "tile";
  opacity?: number;
  /** For `crop`: the part of the image the node shows, as fractions of the image. */
  crop?: { x: number; y: number; width: number; height: number };
  /** For `tile`: the image's scale. */
  scale?: number;
  /** Clockwise rotation in degrees. */
  rotation?: number;
  /** Exposure, contrast and other adjustments, -1..1. */
  filters?: Record<string, number>;
  blendMode?: string;
}

export interface IRStroke {
  paints: IRPaint[];
  /** One weight, or per side. */
  weight: number | IRPadding;
  align: "inside" | "outside" | "center";
  dashes?: number[];
  cap?: string;
  join?: string;
}

export type IREffect =
  | {
      type: "drop-shadow" | "inner-shadow";
      x: number;
      y: number;
      blur: number;
      spread?: number;
      color: string;
      token?: string;
      /** Drop shadow drawn behind a translucent node too. */
      showBehindNode?: true;
    }
  | { type: "layer-blur" | "background-blur"; radius: number };

export interface IRText {
  content: string;
  style: IRTextStyle;
  /** Spans styled differently from `style`, in order, covering the whole content. Absent when uniform. */
  runs?: IRTextRun[];
  /** List formatting per line, when any line is a list item. */
  lines?: Array<{ list?: "ordered" | "unordered"; indent?: number }>;
  /** How the box follows the text: `width` grows both ways, `height` wraps at the width. */
  autoResize?: "width" | "height" | "truncate";
  maxLines?: number;
  /** The whole text links here: a URL, or `#<node id>`. */
  link?: string;
  /**
   * The lines Figma laid the text out in when the file was saved, measured
   * with Figma's own builds of the fonts: where each starts in `content`, in
   * code points, and its width in pixels, trailing spaces included. Shows
   * where Figma wrapped and how wide each line was; a browser with another
   * build of a font measures a few percent differently. Absent when the file
   * holds no layout for the text.
   */
  measuredLines?: Array<{ start: number; width: number }>;
}

export interface IRTextStyle {
  fontFamily: string;
  /** Figma's style name, such as "Semi Bold Italic". */
  fontStyle: string;
  fontWeight: number;
  italic?: true;
  fontSize: number;
  /** In pixels. */
  lineHeight: number;
  /** The line height is Figma's "Auto": the font's own. */
  lineHeightAuto?: true;
  /** In pixels. */
  letterSpacing?: number;
  textAlign?: "center" | "right" | "justify";
  verticalAlign?: "center" | "bottom";
  textTransform?: "uppercase" | "lowercase" | "capitalize" | "small-caps" | "all-small-caps";
  textDecoration?: "underline" | "line-through";
  paragraphSpacing?: number;
  paragraphIndent?: number;
  listSpacing?: number;
  /** Figma's vertical trim: the box runs from the cap height to the baseline. */
  leadingTrim?: "cap";
}

export interface IRTextRun {
  text: string;
  /** What differs from the base style. */
  style?: Partial<IRTextStyle>;
  fills?: IRPaint[];
  link?: string;
}

export interface IRInstanceOf {
  /** The component's id. */
  id: string;
  name: string;
  /** The component set, for a variant. */
  set?: string;
  /** Variant property values. */
  variant?: Record<string, string>;
  /** Other component property values: text, boolean, instance swap (a component id). */
  props?: Record<string, string | boolean>;
  /** Layers inside whose fields were changed on this instance, beyond its properties. */
  overrides?: Array<{ id: string; fields: string[] }>;
  /** Figma scales the instance and all its lengths by this factor. */
  scale?: number;
}

export interface IRComponent {
  id: string;
  name: string;
  kind: "component" | "set";
  description?: string;
  /** Lives in a library; its definition is not in this file. */
  remote?: true;
  /** The page it is defined on. */
  page?: string;
  /** Properties by name. */
  props?: Record<string, IRComponentProp>;
  /** For a set: its variants. */
  variants?: Array<{ id: string; name: string; values: Record<string, string> }>;
  /**
   * Interaction states read from the prototype: variant id → the variant shown
   * while hovering, pressing, or after a click. A front end maps them to
   * `:hover`, `:active` and toggled state.
   */
  states?: Record<string, { hover?: string; press?: string; click?: string; focus?: string }>;
  /** The definition: the component, or the set with its variants as children. */
  root?: IRNode;
}

export interface IRComponentProp {
  type: "variant" | "boolean" | "text" | "instance";
  default: string | boolean;
  /** For variants: the values. */
  options?: string[];
  /** For instance swaps: suggested component ids. */
  preferred?: string[];
}

export interface IRTokens {
  collections: Array<{ id: string; name: string; modes: string[]; defaultMode: string; remote?: true }>;
  /** Tokens by name. */
  tokens: Record<string, IRToken>;
}

export interface IRToken {
  /** The variable's id. */
  id: string;
  collection: string;
  type: "color" | "number" | "string" | "boolean";
  /** A CSS custom property name for it: the variable's web code syntax, or one made from its name. */
  css: string;
  /** Value per mode name. A value that refers to another token is `{ token }`. */
  values: Record<string, string | number | boolean | { token: string }>;
  description?: string;
  scopes?: string[];
}

export type IRStyle =
  | { id: string; name: string; type: "fill"; description?: string; paints: IRPaint[] }
  | { id: string; name: string; type: "text"; description?: string; text: IRTextStyle }
  | { id: string; name: string; type: "effect"; description?: string; effects: IREffect[] }
  | { id: string; name: string; type: "grid"; description?: string };

export interface IRAssets {
  /** Images by hash. */
  images: Record<string, { nodes: number; width?: number; height?: number; mime?: string }>;
  /** SVG artwork by key; nodes of type `svg` name one. */
  svgs: Record<string, { name: string; width: number; height: number; svg: string }>;
  /** Fonts in use, most used first. */
  fonts: Array<{ family: string; style: string; weight: number; italic?: true; nodes: number }>;
}

export type IRInteraction = {
  trigger: IRTrigger;
  /** In milliseconds, for `after-delay`, `mouse-enter` and the like. */
  delay?: number;
  /** For `key`: the key codes. */
  keys?: number[];
  actions: IRAction[];
};

export type IRTrigger =
  | "click"
  | "hover"
  | "press"
  | "drag"
  | "mouse-enter"
  | "mouse-leave"
  | "mouse-down"
  | "mouse-up"
  | "after-delay"
  | "key"
  | "media";

export interface IRAction {
  type: "navigate" | "overlay" | "swap-overlay" | "scroll-to" | "change-to" | "back" | "close" | "open-url";
  /** Target node id: a screen, an overlay, a scroll target or a variant. */
  target?: string;
  targetName?: string;
  url?: string;
  newTab?: boolean;
  transition?: { type: string; duration: number; easing: string; direction?: string };
  preserveScroll?: boolean;
}
