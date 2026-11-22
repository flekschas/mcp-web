/**
 * Error hints for Vega-Lite 6, learned from specs that models got wrong. Each
 * hint is the schema contract at a location where specs were often rejected,
 * keyed by its JSON Schema pointer.
 *
 * The contracts of `PROMOTED_POINTERS` go into the tool description. The
 * others are shown below a problem whose message names their pointer.
 */

export const HINTS_BY_POINTER: Record<string, string> = {
  '/definitions/TopLevelFacetSpec':
    'Schema contract for TopLevelFacetSpec:\ntype TopLevelFacetSpec = { $schema?: string; align?: LayoutAlign | RowCol<LayoutAlign>; autosize?: AutosizeType | AutoSizeParams; background?: Color | ExprRef; bounds?: "full" | "flush"; center?: boolean | RowCol<boolean>; columns?: number; config?: Config; data: Data | null; datasets?: Datasets; description?: string; facet: FacetFieldDef | FacetMapping; name?: string; padding?: Padding | ExprRef; params?: TopLevelParameter[]; resolve?: Resolve; spacing?: number | RowCol<number>; spec: LayerSpec | UnitSpecWithFrame; title?: Text | TitleParams; transform?: Transform[]; usermeta?: Dict };',
  '/definitions/Position2Def':
    'Schema contract for Position2Def:\ntype Position2Def = SecondaryFieldDef | DatumDef | PositionValueDef;\ntype SecondaryFieldDef = { aggregate?: Aggregate; bandPosition?: number; bin?: null; field?: Field; timeUnit?: TimeUnit | BinnedTimeUnit | TimeUnitParams; title?: Text | null };\ntype DatumDef = { bandPosition?: number; datum?: PrimitiveValue | DateTime | ExprRef | RepeatRef; title?: Text | null; type?: Type };\ntype ValueDefNumberWidthHeightExprRef = { value: number | "width" | "height" | ExprRef };',
  '/definitions/FacetFieldDef':
    'Schema contract for FacetFieldDef:\ntype FacetFieldDef = { aggregate?: Aggregate; bandPosition?: number; bin?: boolean | BinParams | null; field?: Field; header?: Header | null; sort?: SortArray | SortOrder | EncodingSortField | null; timeUnit?: TimeUnit | BinnedTimeUnit | TimeUnitParams; title?: Text | null; type?: StandardType };',
  '/definitions/WindowTransform/properties/sort':
    'Schema contract for WindowTransform.sort:\ntype WindowTransformSort = SortField[];\ntype SortField = { field: FieldName; order?: SortOrder | null };',
  '/definitions/MarkConfig':
    'Schema contract for MarkConfig:\ntype MarkConfig = { align?; angle?; aria?; ariaRole?; ariaRoleDescription?; aspect?; baseline?; blend?; color?; cornerRadius?; cornerRadiusBottomLeft?; cornerRadiusBottomRight?; cornerRadiusTopLeft?; cornerRadiusTopRight?; cursor?; description?; dir?; dx?; dy?; ellipsis?; endAngle?; fill?; fillOpacity?; filled?; font?; fontSize?; fontStyle?; fontWeight?; height?; href?; innerRadius?; interpolate?; invalid?; limit?; lineBreak?; lineHeight?; opacity?; order?; orient?; outerRadius?; padAngle?; radius?; radius2?; shape?; size?; smooth?; startAngle?; stroke?; strokeCap?; strokeDash?; strokeDashOffset?; strokeJoin?; strokeMiterLimit?; strokeOffset?; strokeOpacity?; strokeWidth?; tension?; text?; theta?; theta2?; time?; timeUnitBandPosition?; timeUnitBandSize?; tooltip?; url?; width?; x?; x2?; y?; y2? };',
  '/definitions/Transform':
    'Schema contract for Transform:\ntype Transform = AggregateTransform | BinTransform | CalculateTransform | DensityTransform | ExtentTransform | FilterTransform | FlattenTransform | FoldTransform | ImputeTransform | JoinAggregateTransform | LoessTransform | LookupTransform | QuantileTransform | RegressionTransform | TimeUnitTransform | SampleTransform | StackTransform | WindowTransform | PivotTransform;\ntype AggregateTransform = { aggregate: AggregatedFieldDef[]; groupby?: FieldName[] };\ntype BinTransform = { as: FieldName | FieldName[]; bin: true | BinParams; field: FieldName };\ntype CalculateTransform = { as: FieldName; calculate: string };\ntype DensityTransform = { as?: FieldName[]; bandwidth?: number; counts?: boolean; cumulative?: boolean; density: FieldName; extent?: number[]; groupby?: FieldName[]; maxsteps?: number; minsteps?: number; resolve?: "independent" | "shared"; steps?: number };\ntype ExtentTransform = { extent: FieldName; param: ParameterName };\ntype FilterTransform = { filter: PredicateComposition };\ntype FlattenTransform = { as?: FieldName[]; flatten: FieldName[] };\ntype FoldTransform = { as?: FieldName[]; fold: FieldName[] };\ntype JoinAggregateTransform = { groupby?; joinaggregate };',
};

export const PROMOTED_POINTERS: string[] = [
  '/definitions/TopLevelFacetSpec',
  '/definitions/Position2Def',
  '/definitions/FacetFieldDef',
];
