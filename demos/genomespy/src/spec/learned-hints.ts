/**
 * Error hints for GenomeSpy 0.88.1, learned from specs that models got wrong.
 * Each hint is the schema contract at a location where specs were often
 * rejected, keyed by its JSON Schema pointer.
 *
 * The contracts of `PROMOTED_POINTERS` go into the tool description. The
 * others are shown below a problem whose message names their pointer.
 */

export const HINTS_BY_POINTER: Record<string, string> = {
  '/definitions/Scale/properties/domain':
    'Schema contract for Scale.domain:\ntype ScaleDomain = ScalarDomain | ComplexDomain | SelectionDomainRef | ViewportDomainRef | ExprRef | DomainValueArray;\ntype ScalarDomain = NumericDomain | string[] | boolean[];\ntype ComplexDomain = ChromosomalLocus[];\ntype SelectionDomainRef = { encoding?: "x" | "y"; initial?: ScalarDomain | ComplexDomain; param: string };\ntype ViewportDomainRef = { source: "viewport" };\ntype ExprRef = { expr: string };\ntype DomainValueArray = DomainValue[];\ntype NumericDomain = number[];\ntype ChromosomalLocus = { chrom: string; pos?: number };\ntype DomainValue = number | string | boolean | ExprRef;',
  '/definitions/CoreRootSpec/anyOf/0/properties/assembly':
    'Schema contract for CoreRootSpec[0].assembly:\ntype CoreRootSpec0Assembly = string;',
  '/definitions/CoreRootSpec/anyOf/0/properties/genomes':
    'Schema contract for CoreRootSpec[0].genomes:\ntype CoreRootSpec0Genomes = Record<string, NamedGenomeConfig>;',
  '/definitions/CoreRootSpec/anyOf/1/properties/assembly':
    'Schema contract for CoreRootSpec[1].assembly:\ntype CoreRootSpec1Assembly = string;',
  '/definitions/CoreRootSpec/anyOf/1/properties/genomes':
    'Schema contract for CoreRootSpec[1].genomes:\ntype CoreRootSpec1Genomes = Record<string, NamedGenomeConfig>;',
  '/definitions/CoreRootSpec/anyOf/0/properties/mark':
    'Schema contract for CoreRootSpec[0].mark:\ntype CoreRootSpec0Mark = MarkType | MarkProps;\ntype MarkType = "rect" | "point" | "rule" | "tick" | "text" | "link" | "arrow";\ntype MarkProps = RectProps | ArrowProps | TextProps | RuleProps | TickProps | LinkProps | PointProps;\ntype RectProps = { buildIndex?; clip?; color?; cornerRadius?; cornerRadiusBottomLeft?; cornerRadiusBottomRight?; cornerRadiusTopLeft?; cornerRadiusTopRight?; cullByVisibleRange?; cursor?; fill?; fillOpacity?; filled?; hatch?; minHeight?; minOpacity?; minWidth?; opacity?; shadowBlur?; shadowColor?; shadowOffsetX?; shadowOffsetY?; shadowOpacity?; stroke?; strokeOpacity?; strokeWidth?; style?; tooltip?; type: "rect"; x?; x2?; x2Offset?; xOffset?; y?; y2?; y2Offset?; yOffset? };\ntype ArrowProps = { type: "arrow"; … };\ntype TextProps = { type: "text"; … };\ntype RuleProps = { type: "rule"; … };\ntype TickProps = { type: "tick"; … };',
  '/definitions/TickProps':
    'Schema contract for TickProps:\ntype TickProps = { buildIndex?: boolean; clip?: boolean | "x" | "y" | "never"; color?: string | ExprRef; cullByVisibleRange?: boolean | "x" | "y"; cursor?: string | ExprRef; minLength?: number | ExprRef; opacity?: number | ExprRef; orient?: "vertical" | "horizontal"; strokeCap?: "butt" | "square" | "round" | ExprRef; strokeDash?: number[]; strokeDashOffset?: number; style?: string | string[]; thickness?: number; tooltip?: Tooltip; type: "tick"; x?: number | ExprRef; x2Offset?: number | ExprRef; xOffset?: number | ExprRef; y?: number | ExprRef; y2Offset?: number | ExprRef; yOffset?: number | ExprRef };',
  '/definitions/Tooltip':
    'Schema contract for Tooltip:\ntype Tooltip = HandledTooltip | null | false;\ntype HandledTooltip = { handler: string; params?: Record<string, unknown> };',
  '/definitions/PositionFieldDef':
    'Schema contract for PositionFieldDef:\ntype PositionFieldDef = { axis?: GenomeAxis | null; band?: number; description?: string; domainInert?: boolean; field?: string; resolutionChannel?: ChannelWithScale; scale?: Scale | null; title?: string | null; type: Type };',
  '/definitions/TextProps':
    'Schema contract for TextProps:\ntype TextProps = { align?; angle?; baseline?; buildIndex?; clip?; color?; cullByVisibleRange?; cursor?; dx?; dy?; fitToBand?; flushX?; flushY?; font?; fontStyle?; fontWeight?; logoLetters?; opacity?; paddingX?; paddingY?; size?; squeeze?; style?; text?; tooltip?; type: "text"; viewportEdgeFadeDistanceBottom?; viewportEdgeFadeDistanceLeft?; viewportEdgeFadeDistanceRight?; viewportEdgeFadeDistanceTop?; viewportEdgeFadeWidthBottom?; viewportEdgeFadeWidthLeft?; viewportEdgeFadeWidthRight?; viewportEdgeFadeWidthTop?; x?; x2?; x2Offset?; xOffset?; y?; y2?; y2Offset?; yOffset? };',
  '/definitions/UnitSpec/properties/mark':
    'Schema contract for UnitSpec.mark:\ntype UnitSpecMark = MarkType | MarkProps;\ntype MarkType = "rect" | "point" | "rule" | "tick" | "text" | "link" | "arrow";\ntype MarkProps = RectProps | ArrowProps | TextProps | RuleProps | TickProps | LinkProps | PointProps;\ntype RectProps = { buildIndex?; clip?; color?; cornerRadius?; cornerRadiusBottomLeft?; cornerRadiusBottomRight?; cornerRadiusTopLeft?; cornerRadiusTopRight?; cullByVisibleRange?; cursor?; fill?; fillOpacity?; filled?; hatch?; minHeight?; minOpacity?; minWidth?; opacity?; shadowBlur?; shadowColor?; shadowOffsetX?; shadowOffsetY?; shadowOpacity?; stroke?; strokeOpacity?; strokeWidth?; style?; tooltip?; type: "rect"; x?; x2?; x2Offset?; xOffset?; y?; y2?; y2Offset?; yOffset? };\ntype ArrowProps = { type: "arrow"; … };\ntype TextProps = { type: "text"; … };\ntype RuleProps = { type: "rule"; … };\ntype TickProps = { type: "tick"; … };',
  '/definitions/Encoding/properties/x/anyOf/0':
    'Schema contract for Encoding.x[0]:\ntype EncodingX0 = { axis?: GenomeAxis | null; band?: number; buildIndex?: boolean; description?: string; domainInert?: boolean; field?: string; resolutionChannel?: ChannelWithScale; scale?: Scale | null; title?: string | null; type: Type };',
  '/definitions/RuleProps':
    'Schema contract for RuleProps:\ntype RuleProps = { buildIndex?: boolean; clip?: boolean | "x" | "y" | "never"; color?: string | ExprRef; cullByVisibleRange?: boolean | "x" | "y"; cursor?: string | ExprRef; minLength?: number | ExprRef; opacity?: number | ExprRef; size?: number | ExprRef; strokeCap?: "butt" | "square" | "round" | ExprRef; strokeDash?: number[]; strokeDashOffset?: number; style?: string | string[]; tooltip?: Tooltip; type: "rule"; x?: number | ExprRef; x2?: number | ExprRef; x2Offset?: number | ExprRef; xOffset?: number | ExprRef; y?: number | ExprRef; y2?: number | ExprRef; y2Offset?: number | ExprRef; yOffset?: number | ExprRef };',
  '/definitions/Legend':
    'Schema contract for Legend:\ntype Legend = { backgroundFill?: string; backgroundFillOpacity?: number; backgroundStroke?: string; backgroundStrokeOpacity?: number; backgroundStrokeWidth?: number; columns?: number; direction?: LegendDirection; gradientLength?: number; gradientOpacity?: number; gradientStrokeColor?: string; gradientStrokeWidth?: number; gradientThickness?: number; labelLimit?: number; offset?: number; orient?: LegendOrient | ExprRef; padding?: number; style?: string | string[] | null; symbolFillColor?: string; symbolOpacity?: number; symbolSize?: number; symbolStrokeColor?: string; symbolStrokeWidth?: number; symbolType?: string; tickCount?: number; title?: string | null; titleOrient?: LegendTitleOrient; values?: (string | number | boolean)[] };',
  '/definitions/GenomeConfig':
    'Schema contract for GenomeConfig:\ntype GenomeConfig = UrlGenomeConfig | InlineGenomeConfig | GenomeConfigBase;\ntype UrlGenomeConfig = { name: string; url: string };\ntype InlineGenomeConfig = { contigs: Contig[]; name: string };\ntype GenomeConfigBase = { name: string };',
  '/definitions/CoreRootSpec/anyOf/0':
    'Schema contract for CoreRootSpec[0]:\ntype CoreRootSpec0 = { $schema?; assembly?; axes?; background?; baseUrl?; config?; cursor?; data?; datasets?; description?; domainInert?; encoding?; genome?; genomes?; height?; legends?; mark; name?; opacity?; overhang?; padding?; params?; resolve?; scales?; templates?; theme?; title?; transform?; view?; viewportHeight?; viewportWidth?; visible?; width?; zindex? };',
  '/definitions/Encoding/properties/x/anyOf/1':
    'Schema contract for Encoding.x[1]:\ntype EncodingX1 = { axis?: GenomeAxis | null; band?: number; buildIndex?: boolean; chrom: FieldName; description?: string; domainInert?: boolean; offset?: number; pos?: FieldName; resolutionChannel?: ChannelWithScale; scale?: Scale | null; title?: string | null; type: "locus" };',
  '/definitions/SecondaryChromPosDef':
    'Schema contract for SecondaryChromPosDef:\ntype SecondaryChromPosDef = { axis?: GenomeAxis | null; band?: number; chrom: FieldName; description?: string; domainInert?: boolean; offset?: number; pos?: FieldName; title?: string | null };',
  '/definitions/CoreRootSpec':
    'Schema contract for CoreRootSpec:\ntype CoreRootSpec = { $schema?: string; assembly?: string; axes?: { x?: Record<string, unknown>; y?: Record<string, unknown> }; background?: string; baseUrl?: string; config?: GenomeSpyConfig; cursor?: string | ExprRef; data?: Data; datasets?: Record<string, unknown[]>; description?: string | unknown[]; domainInert?: boolean; encoding?: Encoding; genome?: GenomeConfig; genomes?: Record<string, NamedGenomeConfig>; height?: SizeDef | number | Step | ExprRef | "container"; legends?: { angle?: Legend; color?: Legend; dx?: Legend; dy?: Legend; fill?: Legend; fillOpacity?: Legend; opacity?: Legend; shape?: Legend; size?: Legend; stroke?: Legend; strokeOpacity?: Legend; strokeWidth?: Legend; xOffset?: Legend; yOffset?: Legend }; mark: MarkType | MarkProps; name?: string; opacity?: ViewOpacityDef; overhang?: OverhangConfig; padding?: PaddingConfig; params?: Parameter[ …',
  '/definitions/Type':
    'Schema contract for Type:\ntype Type = "quantitative" | "ordinal" | "nominal" | "index" | "locus";',
  '/definitions/CoreRootSpec/anyOf/3':
    'Schema contract for CoreRootSpec[3]:\ntype CoreRootSpec3 = { $schema?; annotate?; assembly?; axes?; background?; baseUrl?; config?; cursor?; data?; datasets?; description?; domainInert?; encoding?; genome?; genomes?; height?; legends?; name?; overhang?; padding?; params?; resolve?; scales?; separator?; spacing?; templates?; theme?; title?; transform?; vconcat; viewportHeight?; viewportWidth?; visible?; width?; zindex? };',
  '/definitions/Encoding':
    'Schema contract for Encoding:\ntype Encoding = { angle?; color?; direction?; dx?; dy?; facetIndex?; fill?; fillOpacity?; key?; opacity?; order?; sample?; search?; semanticScore?; shape?; size?; stroke?; strokeOpacity?; strokeWidth?; text?; tooltip?; uniqueId?; x?; x2?; xOffset?; y?; y2?; yOffset? };',
  '/definitions/ViewBackground':
    'Schema contract for ViewBackground:\ntype ViewBackground = { fill?: string; fillOpacity?: number; shadowBlur?: number | ExprRef; shadowColor?: string | ExprRef; shadowOffsetX?: number | ExprRef; shadowOffsetY?: number | ExprRef; shadowOpacity?: number | ExprRef; stroke?: string; strokeOpacity?: number; strokeWidth?: number; strokeZindex?: number; style?: string | string[]; zindex?: number };',
  '/definitions/Encoding/properties/x':
    'Schema contract for Encoding.x:\ntype EncodingX = { axis?: GenomeAxis | null; band?: number; buildIndex?: boolean; description?: string; domainInert?: boolean; field?: string; resolutionChannel?: ChannelWithScale; scale?: Scale | null; title?: string | null; type: Type } | { axis?: GenomeAxis | null; band?: number; buildIndex?: boolean; chrom: FieldName; description?: string; domainInert?: boolean; offset?: number; pos?: FieldName; resolutionChannel?: ChannelWithScale; scale?: Scale | null; title?: string | null; type: "locus" } | { axis?: GenomeAxis | null; band?: number; buildIndex?: boolean; datum?: Scalar | ExprRef; description?: string; domainInert?: boolean; resolutionChannel?: ChannelWithScale; scale?: Scale | null; title?: string | null; type: Type } | { axis?: GenomeAxis | null; band?: number; buildIndex?: boolean; description?: string; domainInert?: boolean; expr: string; title?: string | null; type: Type } | {  …',
  '/definitions/GenomeSpyConfig':
    'Schema contract for GenomeSpyConfig:\ntype GenomeSpyConfig = { arrow?: ArrowConfig; axis?: AxisConfig; axisBottom?: AxisConfig; axisIndex?: AxisConfig; axisLeft?: AxisConfig; axisLocus?: AxisConfig; axisNominal?: AxisConfig; axisOrdinal?: AxisConfig; axisQuantitative?: AxisConfig; axisRight?: AxisConfig; axisTop?: AxisConfig; axisX?: AxisConfig; axisY?: AxisConfig; legend?: LegendConfig; legendTrack?: LegendConfig; link?: LinkConfig; mark?: MarkConfig; point?: PointConfig; range?: RangeConfig; rect?: RectConfig; rule?: RuleConfig; scale?: ScaleConfig; style?: Record<string, StyleConfig>; text?: TextConfig; tick?: TickConfig; title?: TitleConfig; view?: ViewConfig };',
  '/definitions/CoreRootSpec/anyOf/5':
    'Schema contract for CoreRootSpec[5]:\ntype CoreRootSpec5 = { $schema?; assembly?; axes?; background?; baseUrl?; columns; concat; config?; cursor?; data?; datasets?; description?; domainInert?; encoding?; genome?; genomes?; height?; legends?; name?; overhang?; padding?; params?; resolve?; scales?; separator?; spacing?; templates?; theme?; title?; transform?; viewportHeight?; viewportWidth?; visible?; width?; zindex? };',
  '/definitions/UnitSpec':
    'Schema contract for UnitSpec:\ntype UnitSpec = { axes?; baseUrl?; config?; cursor?; data?; datasets?; description?; domainInert?; encoding?; height?; legends?; mark; name?; opacity?; overhang?; padding?; params?; resolve?; scales?; templates?; title?; transform?; view?; viewportHeight?; viewportWidth?; visible?; width?; zindex? };',
  '/definitions/Scale':
    'Schema contract for Scale:\ntype Scale = { align?: number; assembly?: string | InlineLocusAssembly; base?: number; bins?: number[]; clamp?: boolean; constant?: number; domain?: ScalarDomain | ComplexDomain | SelectionDomainRef | ViewportDomainRef | ExprRef | DomainValueArray; domainMax?: number; domainMid?: number; domainMin?: number; domainTransition?: boolean; exponent?: number; interpolate?: ScaleInterpolate | ScaleInterpolateParams; name?: string; nice?: boolean | number | { interval: string; step: number }; numberingOffset?: number; padding?: number; paddingInner?: number; paddingOuter?: number; range?: unknown[] | string; reverse?: boolean; round?: boolean; scheme?: string | SchemeParams; type?: ScaleType; zero?: boolean; zoom?: boolean | ZoomParams };',
  '/definitions/GenomeConfigBase':
    'Schema contract for GenomeConfigBase:\ntype GenomeConfigBase = { name: string };',
  '/definitions/GenomeAxis':
    'Schema contract for GenomeAxis:\ntype GenomeAxis = { chromGrid?; chromGridCap?; chromGridColor?; chromGridDash?; chromGridDashOffset?; chromGridFillEven?; chromGridFillOdd?; chromGridOpacity?; chromGridWidth?; chromLabelAlign?; chromLabelColor?; chromLabelFont?; chromLabelFontSize?; chromLabelFontStyle?; chromLabelFontWeight?; chromLabelPadding?; chromLabels?; chromTickColor?; chromTickDash?; chromTickDashOffset?; chromTickSize?; chromTickWidth?; chromTicks?; domain?; domainCap?; domainColor?; domainDash?; domainDashOffset?; domainWidth?; extraValues?; format?; grid?; gridCap?; gridColor?; gridDash?; gridDashOffset?; gridOpacity?; gridWidth?; labelAlign?; labelAngle?; labelBaseline?; labelColor?; labelFlush?; labelFlushOffset?; labelFont?; labelFontSize?; labelFontStyle?; labelFontWeight?; labelLimit?; labelOverlap?; labelPadding?; labelSeparation?; labels?; maxExtent?; minExtent?; offset?; orient?; placement?; style?; tickCap?; tickColor?; tickCount?; tickDash?; tickDashOffset?; tickMinStep?; tickSize?; tickWidth?; ticks?; title?; titleColor?; titleFit?; titleFont?; titleFontSize?; titleFontStyle?; titleFontWeight?; titleOpacity?; titlePadding? …',
  '/definitions/Encoding/properties/x2':
    'Schema contract for Encoding.x2:\ntype EncodingX2 = Position2Def | null;\ntype Position2Def = { band?: number; description?: string; domainInert?: boolean; field?: string; title?: string | null } | SecondaryChromPosDef | { band?: number; datum?: Scalar | ExprRef; description?: string; domainInert?: boolean; resolutionChannel?: ChannelWithScale; scale?: Scale | null; title?: string | null; type?: Type } | { band?: number; description?: string; domainInert?: boolean; expr: string; title?: string | null; type?: Type } | PositionValueDef;\ntype SecondaryChromPosDef = { axis?: GenomeAxis | null; band?: number; chrom: FieldName; description?: string; domainInert?: boolean; offset?: number; pos?: FieldName; title?: string | null };\ntype ValueDefNumber = { description?: string; title?: string | null; value: number | ExprRef };',
  '/definitions/ScaleType':
    'Schema contract for ScaleType:\ntype ScaleType = "null" | "linear" | "log" | "pow" | "sqrt" | "symlog" | "identity" | "sequential" | "quantize" | "threshold" | "ordinal" | "point" | "band" | "index" | "locus";',
  '/definitions/CoreRootSpec/anyOf/1':
    'Schema contract for CoreRootSpec[1]:\ntype CoreRootSpec1 = { $schema?; assembly?; axes?; background?; baseUrl?; config?; cursor?; data?; datasets?; description?; domainInert?; encoding?; genome?; genomes?; height?; layer; legends?; name?; opacity?; overhang?; padding?; params?; resolve?; scales?; templates?; theme?; title?; transform?; view?; viewportHeight?; viewportWidth?; visible?; width?; zindex? };',
  '/definitions/ValueDef<number>/properties/value':
    'Schema contract for ValueDef<number>.value:\ntype ValueDefNumberValue = number | ExprRef;\ntype ExprRef = { expr: string };',
  '/definitions/Encoding/properties/y2':
    'Schema contract for Encoding.y2:\ntype EncodingY2 = Position2Def | null;\ntype Position2Def = { band?: number; description?: string; domainInert?: boolean; field?: string; title?: string | null } | SecondaryChromPosDef | { band?: number; datum?: Scalar | ExprRef; description?: string; domainInert?: boolean; resolutionChannel?: ChannelWithScale; scale?: Scale | null; title?: string | null; type?: Type } | { band?: number; description?: string; domainInert?: boolean; expr: string; title?: string | null; type?: Type } | PositionValueDef;\ntype SecondaryChromPosDef = { axis?: GenomeAxis | null; band?: number; chrom: FieldName; description?: string; domainInert?: boolean; offset?: number; pos?: FieldName; title?: string | null };\ntype ValueDefNumber = { description?: string; title?: string | null; value: number | ExprRef };',
  '/definitions/PositionDatumDef/properties/datum':
    'Schema contract for PositionDatumDef.datum:\ntype PositionDatumDefDatum = Scalar | ExprRef;\ntype Scalar = string | number | boolean;\ntype ExprRef = { expr: string };',
  '/definitions/CoreRootSpec/anyOf/3/properties/resolve':
    'Schema contract for CoreRootSpec[3].resolve:\ntype CoreRootSpec3Resolve = { axis?: ResolutionMap<ResolutionBehavior>; legend?: ResolutionMap<LegendResolutionBehavior>; scale?: ResolutionMap<ResolutionBehavior> };',
  '/definitions/CoreRootSpec/anyOf/3/properties/assembly':
    'Schema contract for CoreRootSpec[3].assembly:\ntype CoreRootSpec3Assembly = string;',
  '/definitions/ProjectParams':
    'Schema contract for ProjectParams:\ntype ProjectParams = { as?: string[]; description?: string; fields: Field[]; type: "project" };',
  '/definitions/ProjectParams/properties/as':
    'Schema contract for ProjectParams.as:\ntype ProjectParamsAs = string[];',
  '/definitions/ViewBackground/properties/stroke':
    'Schema contract for ViewBackground.stroke:\ntype ViewBackgroundStroke = string;',
  '/definitions/Encoding/properties/x/anyOf/1/properties/axis':
    'Schema contract for Encoding.x[1].axis:\ntype EncodingX1Axis = GenomeAxis | null;',
  '/definitions/PositionFieldDef/properties/axis':
    'Schema contract for PositionFieldDef.axis:\ntype PositionFieldDefAxis = GenomeAxis | null;',
  '/definitions/FieldOrDatumDefWithCondition<MarkPropFieldDef<Type>,(string|null)>/properties/legend':
    'Schema contract for FieldOrDatumDefWithCondition<MarkPropFieldDef<Type>,(string|null)>.legend:\ntype FieldOrDatumDefWithConditionMarkPropFieldDefTypeStringNullLegend = Legend | null;\ntype Legend = { backgroundFill?: string; backgroundFillOpacity?: number; backgroundStroke?: string; backgroundStrokeOpacity?: number; backgroundStrokeWidth?: number; columns?: number; direction?: LegendDirection; gradientLength?: number; gradientOpacity?: number; gradientStrokeColor?: string; gradientStrokeWidth?: number; gradientThickness?: number; labelLimit?: number; offset?: number; orient?: LegendOrient | ExprRef; padding?: number; style?: string | string[] | null; symbolFillColor?: string; symbolOpacity?: number; symbolSize?: number; symbolStrokeColor?: string; symbolStrokeWidth?: number; symbolType?: string; tickCount?: number; title?: string | null; titleOrient?: LegendTitleOrient; values?: (string | number | boolean)[] };',
  '/definitions/PointProps':
    'Schema contract for PointProps:\ntype PointProps = { angle?; buildIndex?; clip?; color?; cullByVisibleRange?; cursor?; dx?; dy?; fill?; fillGradientStrength?; fillOpacity?; filled?; geometricZoomBound?; inwardStroke?; minPickingSize?; opacity?; sampleFacetPadding?; semanticScore?; semanticZoomFraction?; shape?; size?; stroke?; strokeOpacity?; strokeWidth?; style?; tooltip?; type: "point"; x?; x2Offset?; xOffset?; y?; y2Offset?; yOffset? };',
  '/definitions/FieldOrDatumDefWithCondition<MarkPropFieldDef<Type>,(string|null)>':
    'Schema contract for FieldOrDatumDefWithCondition<MarkPropFieldDef<Type>,(string|null)>:\ntype FieldOrDatumDefWithConditionMarkPropFieldDefTypeStringNull = { condition?: Conditional<ValueDef<(string|null|ExprRef)>> | Conditional<ValueDef<(string|null|ExprRef)>>[]; description?: string; domainInert?: boolean; field?: string; format?: string; legend?: Legend | null; resolutionChannel?: ChannelWithScale; scale?: Scale | null; title?: string | null; type: Type };',
  '/definitions/InlineGenomeConfig':
    'Schema contract for InlineGenomeConfig:\ntype InlineGenomeConfig = { contigs: Contig[]; name: string };',
  '/definitions/MarkPropDef<(string|null)>':
    'Schema contract for MarkPropDef<(string|null)>:\ntype MarkPropDefStringNull = FieldOrDatumDefWithCondition<MarkPropFieldDef<Type>,(string|null)> | FieldOrDatumDefWithCondition<ScaleDatumDef,(string|null)> | MarkPropExprDef<Type> | ValueDefWithCondition<(string|null),Type>;\ntype FieldOrDatumDefWithConditionMarkPropFieldDefTypeStringNull = { condition?: Conditional<ValueDef<(string|null|ExprRef)>> | Conditional<ValueDef<(string|null|ExprRef)>>[]; description?: string; domainInert?: boolean; field?: string; format?: string; legend?: Legend | null; resolutionChannel?: ChannelWithScale; scale?: Scale | null; title?: string | null; type: Type };\ntype FieldOrDatumDefWithConditionScaleDatumDefStringNull = { band?; condition?; datum?; description?; domainInert?; resolutionChannel?; scale?; title?; type? };\ntype ValueDefWithConditionStringNullType = { condition?; description?; title?; value? };',
  '/definitions/FlattenParams':
    'Schema contract for FlattenParams:\ntype FlattenParams = { as?: string[] | string; description?: string; fields?: Field[] | Field; index?: string; type: "flatten" };',
  '/definitions/RectProps':
    'Schema contract for RectProps:\ntype RectProps = { buildIndex?; clip?; color?; cornerRadius?; cornerRadiusBottomLeft?; cornerRadiusBottomRight?; cornerRadiusTopLeft?; cornerRadiusTopRight?; cullByVisibleRange?; cursor?; fill?; fillOpacity?; filled?; hatch?; minHeight?; minOpacity?; minWidth?; opacity?; shadowBlur?; shadowColor?; shadowOffsetX?; shadowOffsetY?; shadowOpacity?; stroke?; strokeOpacity?; strokeWidth?; style?; tooltip?; type: "rect"; x?; x2?; x2Offset?; xOffset?; y?; y2?; y2Offset?; yOffset? };',
};

export const PROMOTED_POINTERS: string[] = [
  '/definitions/Scale/properties/domain',
  '/definitions/Tooltip',
  '/definitions/PositionFieldDef',
  '/definitions/Legend',
  '/definitions/GenomeConfig',
  '/definitions/SecondaryChromPosDef',
  '/definitions/Type',
  '/definitions/GenomeConfigBase',
  '/definitions/CoreRootSpec/anyOf/0/properties/assembly',
  '/definitions/CoreRootSpec/anyOf/0/properties/genomes',
  '/definitions/CoreRootSpec/anyOf/0/properties/mark',
  '/definitions/TickProps',
  '/definitions/TextProps',
  '/definitions/UnitSpec/properties/mark',
  '/definitions/Encoding/properties/x/anyOf/1',
  '/definitions/CoreRootSpec/anyOf/1',
  '/definitions/CoreRootSpec/anyOf/3/properties/assembly',
  '/definitions/ProjectParams/properties/as',
  '/definitions/ViewBackground/properties/stroke',
  '/definitions/PositionFieldDef/properties/axis',
  '/definitions/InlineGenomeConfig',
  '/definitions/Encoding/properties/x/anyOf/0',
  '/definitions/RuleProps',
];
