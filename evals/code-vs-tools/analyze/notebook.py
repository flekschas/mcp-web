import marimo

__generated_with = "0.20.2"
app = marimo.App(width="full")


@app.cell
def imports():
    import marimo as mo
    import polars as pl
    import seaborn as sns
    import matplotlib.pyplot as plt
    import matplotlib as mpl
    import numpy as np
    import altair as alt
    from scipy import stats
    from pathlib import Path
    import json
    from datetime import datetime, timezone

    sns.set_theme(style="whitegrid", font_scale=0.85)
    mpl.rcParams["figure.dpi"] = 144
    return Path, alt, datetime, json, mo, np, pl, plt, sns, stats, timezone


@app.cell
def discover_results(Path, datetime, timezone):
    _results_dir = Path(__file__).parent.parent / "results"

    def _parse_ts(stem: str) -> datetime:
        _parts = stem.split("T")
        _date_part = _parts[0]
        _time_parts = _parts[1].rstrip("Z").split("-")
        _iso = f"{_date_part}T{_time_parts[0]}:{_time_parts[1]}:{_time_parts[2]}.{_time_parts[3]}+00:00"
        return datetime.fromisoformat(_iso)

    def _label(stem: str) -> str:
        try:
            _dt = _parse_ts(stem)
            return _dt.astimezone(timezone.utc).strftime("%b %d, %Y  %H:%M:%S UTC")
        except Exception:
            return stem

    _jsonl_files = sorted(_results_dir.glob("*.jsonl"), reverse=True)
    file_options = {_label(f.stem): str(f) for f in _jsonl_files}
    return (file_options,)


@app.cell
def file_picker(file_options, mo):
    file_dropdown = mo.ui.dropdown(
        options=file_options,
        label="Results file",
        value=list(file_options.keys())[0] if file_options else None,
    )
    return (file_dropdown,)


@app.cell
def header(file_dropdown, mo):
    mo.vstack([
        mo.md("# Code Tool vs Normal Tools — Eval Analysis"),
        file_dropdown,
    ])
    return


@app.cell
def load_data(file_dropdown, json, pl):
    df_raw = pl.DataFrame()

    if file_dropdown.value is not None:
        _records = []
        with open(file_dropdown.value) as _f:
            for _line in _f:
                _line = _line.strip()
                if not _line:
                    continue
                _r = json.loads(_line)
                _records.append({
                    "model": _r["model"],
                    "condition": _r["condition"],
                    "app": _r["app"],
                    "caseId": _r["caseId"],
                    "repetition": _r["repetition"],
                    "exact": _r["success"]["exact"],
                    "editDistance": _r["success"]["editDistance"],
                    "normalizedScore": _r["success"]["normalizedScore"],
                    "wallClockMs": _r["wallClockMs"],
                    "toolCallCount": _r["toolCallCount"],
                    "innerToolCallCount": _r["innerToolCallCount"],
                    "tokensTotal": _r["tokens"]["total"],
                    "error": _r.get("error"),
                })
        df_raw = pl.DataFrame(_records)

    df_raw.head(5)
    return (df_raw,)


@app.cell
def prepare_data(df_raw, pl):
    df = df_raw

    if not df_raw.is_empty():
        df = (
            df_raw
            .filter(pl.col("error").is_null())
            .with_columns([
                (pl.col("wallClockMs") / 1000).alias("wallClockSec"),
                (pl.col("tokensTotal") / 1000).alias("tokensK"),
            ])
        )

    df.head(5)
    return (df,)


@app.cell
def data_summary(df, df_raw, mo, pl):
    _out = mo.md("_No data loaded. Select a results file above._")

    if not df_raw.is_empty():
        _n_total = df_raw.height
        _n_errors = df_raw.filter(pl.col("error").is_not_null()).height
        _n_valid = df.height
        _models = sorted(df["model"].unique().to_list())
        _conditions = sorted(df["condition"].unique().to_list())
        _apps = sorted(df["app"].unique().to_list())
        _cases = sorted(df["caseId"].unique().to_list())

        _out = mo.md(f"""### Data Summary
        | | |
        |---|---|
        | **Total runs** | {_n_total} |
        | **Error runs** (excluded) | {_n_errors} |
        | **Valid runs** | {_n_valid} |
        | **Models** | {", ".join(f"`{m}`" for m in _models)} |
        | **Conditions** | {", ".join(f"`{c}`" for c in _conditions)} |
        | **Apps** | {", ".join(f"`{a}`" for a in _apps)} |
        | **Cases** | {", ".join(f"`{c}`" for c in _cases)} |
        """)

    _out
    return


@app.cell
def aggregate_table(df, mo, pl):
    _out = mo.md("Nothing loaded")

    if not df.is_empty():
        _agg = (
            df.group_by(["model", "condition"])
            .agg([
                pl.col("normalizedScore").mean().alias("score_mean"),
                pl.col("normalizedScore").std().alias("score_std"),
                pl.col("exact").cast(pl.Int32).mean().alias("exact_rate"),
                pl.col("wallClockSec").mean().alias("time_mean_s"),
                pl.col("wallClockSec").std().alias("time_std_s"),
                pl.col("toolCallCount").mean().alias("tools_mean"),
                pl.col("tokensK").mean().alias("tokens_mean_k"),
                pl.col("tokensK").std().alias("tokens_std_k"),
                pl.len().alias("n"),
            ])
            .sort(["model", "condition"])
        )

        _out = mo.vstack([
            mo.md("### Aggregate Summary"),
            mo.ui.table(_agg),
        ])

    _out
    return


@app.cell
def melt_data(df, pl):
    df_long = pl.DataFrame()

    if not df.is_empty():
        _metric_cols = {
            "Score": "normalizedScore",
            "Time (s)": "wallClockSec",
            "Tool Calls": "toolCallCount",
            "Tokens (k)": "tokensK",
        }

        _frames = []
        for _display_name, _col_name in _metric_cols.items():
            _chunk = df.select([
                pl.col("model"),
                pl.col("condition"),
                pl.col("app"),
                pl.col("caseId"),
                pl.col("repetition"),
                pl.col(_col_name).cast(pl.Float64).alias("value"),
                pl.lit(_display_name).alias("metric"),
            ])
            _frames.append(_chunk)

        df_long = pl.concat(_frames).with_columns(
            (pl.col("metric") + pl.lit(" (") + pl.col("condition") + pl.lit(")"))
            .alias("metric_condition")
        )

    df_long.head(5)
    return (df_long,)


@app.cell
def facet_grid(df_long, mo, plt, sns):
    _out = mo.md("_No data for visualization._")

    if not df_long.is_empty():
        _pdf = df_long.to_pandas()
        _metric_order = ["Score", "Time (s)", "Tool Calls", "Tokens (k)"]
        _condition_order = ["normal-tools", "code-tool"]
        _col_order = [
            f"{m} ({c})" for m in _metric_order for c in _condition_order
        ]
        _col_order = [c for c in _col_order if c in _pdf["metric_condition"].unique()]
        _model_order = sorted(_pdf["model"].unique())

        _g = sns.FacetGrid(
            _pdf,
            col="metric_condition",
            row="model",
            col_order=_col_order,
            row_order=_model_order,
            sharex=False,
            sharey=False,
            height=1.3,
            aspect=1.1,
            margin_titles=True,
        )

        _g.map_dataframe(
            sns.stripplot,
            x="value",
            color="#2196F3",
            alpha=0.7,
            size=4,
            jitter=0.15,
        )
        _g.map_dataframe(
            sns.boxplot,
            x="value",
            color="#2196F3",
            width=0.4,
            fliersize=0,
            boxprops=dict(alpha=0.3),
            whiskerprops=dict(alpha=0.5),
            medianprops=dict(color="#D32F2F", linewidth=1.5),
        )

        _g.set_titles(col_template="{col_name}", row_template="{row_name}")
        _g.set_xlabels("")
        _g.set_ylabels("")

        for _ax in _g.axes[0]:
            _title = _ax.get_title()
            if "(code-tool)" in _title:
                _ax.set_title(_title, color="#1565C0", fontweight="bold")
            elif "(normal-tools)" in _title:
                _ax.set_title(_title, color="#E65100", fontweight="bold")

        _g.fig.subplots_adjust(hspace=0.4, wspace=0.4)
        _g.fig.suptitle(
            "Distribution of Metrics by Model and Condition",
            y=1.02, fontsize=14, fontweight="bold",
        )
        plt.tight_layout()

        _out = mo.vstack([
            mo.md("### Faceted Metric Grid"),
            mo.as_html(_g.fig),
        ])

    _out
    return


@app.cell
def altair_overview(alt, df, mo):
    _out = mo.md("No data loaded")

    if not df.is_empty():
        _pdf = df.to_pandas()

        _chart = alt.Chart(_pdf).mark_circle(size=60, opacity=0.7).encode(
            x=alt.X("wallClockSec:Q", title="Wall Clock Time (s)"),
            y=alt.Y("normalizedScore:Q", title="Normalized Score",
                     scale=alt.Scale(domain=[0, 1.05])),
            color=alt.Color("condition:N", scale=alt.Scale(
                domain=["normal-tools", "code-tool"],
                range=["#E65100", "#1565C0"],
            )),
            shape=alt.Shape("model:N"),
            tooltip=["model:N", "condition:N", "app:N", "caseId:N",
                     "normalizedScore:Q", "wallClockSec:Q",
                     "toolCallCount:Q", "tokensK:Q"],
        ).properties(width=600, height=300).interactive()

        _out = mo.vstack([
            mo.md("### Interactive: Score vs Time"),
            _chart,
        ])

    _out
    return


@app.cell
def stat_helpers(np, stats):
    def cohens_d(x, y):
        _nx, _ny = len(x), len(y)
        if _nx < 2 or _ny < 2:
            return float("nan")
        _pooled_std = np.sqrt(
            ((_nx - 1) * np.std(x, ddof=1) ** 2 + (_ny - 1) * np.std(y, ddof=1) ** 2)
            / (_nx + _ny - 2)
        )
        if _pooled_std == 0:
            return 0.0
        return (np.mean(x) - np.mean(y)) / _pooled_std

    def paired_test(tools_vals, code_vals):
        _n = min(len(tools_vals), len(code_vals))
        if _n < 2:
            return float("nan"), float("nan"), "n/a"
        _diffs = np.array(tools_vals[:_n]) - np.array(code_vals[:_n])
        _nonzero = _diffs[_diffs != 0]
        if len(_nonzero) < 1:
            return 0.0, 1.0, "all-equal"
        if len(_nonzero) < 6:
            _n_pos = int(np.sum(_nonzero > 0))
            _p = stats.binomtest(_n_pos, len(_nonzero), 0.5).pvalue
            return float(_n_pos), _p, "sign-test"
        try:
            _stat, _p = stats.wilcoxon(_nonzero, alternative="two-sided")
            return float(_stat), float(_p), "wilcoxon"
        except Exception:
            return float("nan"), float("nan"), "error"

    def effect_size_label(d):
        _ad = abs(d)
        if np.isnan(_ad):
            return ""
        if _ad < 0.2:
            return "negligible"
        if _ad < 0.5:
            return "small"
        if _ad < 0.8:
            return "medium"
        return "large"

    return cohens_d, effect_size_label, paired_test


@app.cell
def run_stats(cohens_d, df, effect_size_label, np, paired_test, pl):
    stats_results = pl.DataFrame()

    if not df.is_empty():
        _metrics = [
            ("normalizedScore", "Score"),
            ("wallClockSec", "Time (s)"),
            ("toolCallCount", "Tool Calls"),
            ("tokensK", "Tokens (k)"),
        ]
        _rows = []
        _models = sorted(df["model"].unique().to_list())

        for _model in _models:
            _model_df = df.filter(pl.col("model") == _model)
            for _col_name, _display_name in _metrics:
                _tools_df = (
                    _model_df.filter(pl.col("condition") == "normal-tools")
                    .select(["app", "caseId", "repetition",
                             pl.col(_col_name).alias("tools_val")])
                    .sort(["app", "caseId", "repetition"])
                )
                _code_df = (
                    _model_df.filter(pl.col("condition") == "code-tool")
                    .select(["app", "caseId", "repetition",
                             pl.col(_col_name).alias("code_val")])
                    .sort(["app", "caseId", "repetition"])
                )
                _paired = _tools_df.join(
                    _code_df, on=["app", "caseId", "repetition"], how="inner"
                )
                if _paired.height == 0:
                    continue

                _tv = _paired["tools_val"].to_numpy().astype(float)
                _cv = _paired["code_val"].to_numpy().astype(float)
                _d = cohens_d(_tv, _cv)
                _stat, _p, _test_name = paired_test(_tv, _cv)

                _rows.append({
                    "model": _model,
                    "metric": _display_name,
                    "tools_mean": round(float(np.mean(_tv)), 3),
                    "code_mean": round(float(np.mean(_cv)), 3),
                    "diff": round(float(np.mean(_tv) - np.mean(_cv)), 3),
                    "cohens_d": round(_d, 3),
                    "effect": effect_size_label(_d),
                    "p_value": round(_p, 4),
                    "test": _test_name,
                    "n_pairs": _paired.height,
                    "significant": bool(_p < 0.05) if not np.isnan(_p) else False,
                })

        stats_results = pl.DataFrame(_rows) if _rows else pl.DataFrame()

    stats_results.head(5)
    return (stats_results,)


@app.cell
def stats_table(mo, stats_results):
    _out = mo.md("_No statistical results to display._")

    if not stats_results.is_empty():
        _out = mo.vstack([
            mo.md("""### Statistical Comparisons (Normal-Tools vs Code-Tool)

        Within-model paired comparisons. Positive `diff` means normal-tools > code-tool.
        **Cohen's d**: positive = normal-tools higher. Significance at p < 0.05.
        """),
            mo.ui.table(stats_results.to_pandas()),
        ])

    _out
    return


@app.cell
def effect_heatmap(mo, plt, sns, stats_results):
    _out = None

    if not stats_results.is_empty():
        _pdf = stats_results.to_pandas()

        _d_pivot = _pdf.pivot(index="model", columns="metric", values="cohens_d")

        def _annot(row):
            _star = " *" if row["significant"] else ""
            return f"{row['cohens_d']:.2f}{_star}"

        _pdf["label"] = _pdf.apply(_annot, axis=1)
        _annot_pivot = _pdf.pivot(index="model", columns="metric", values="label")

        _col_order = ["Score", "Time (s)", "Tool Calls", "Tokens (k)"]
        _col_order = [c for c in _col_order if c in _d_pivot.columns]
        _d_pivot = _d_pivot[_col_order]
        _annot_pivot = _annot_pivot[_col_order]

        _fig, _ax = plt.subplots(
            figsize=(8, max(2.5, len(_d_pivot) * 0.6 + 1))
        )
        sns.heatmap(
            _d_pivot.astype(float),
            annot=_annot_pivot.values,
            fmt="",
            cmap="RdBu_r",
            center=0, vmin=-2, vmax=2,
            linewidths=0.5,
            ax=_ax,
            cbar_kws={"label": "Cohen's d (tools - code)"},
        )
        _ax.set_title(
            "Effect Sizes: Normal-Tools vs Code-Tool\n(* = p < 0.05)",
            fontsize=12,
        )
        _ax.set_xlabel("")
        _ax.set_ylabel("")
        plt.tight_layout()

        _out = mo.vstack([
            mo.md("### Effect Size Heatmap"),
            mo.md("Positive/red = normal-tools higher. Negative/blue = code-tool higher."),
            mo.as_html(_fig),
        ])

    _out
    return


@app.cell
def per_case_chart(alt, df, mo, pl):
    _out = None

    if not df.is_empty():
        _agg = (
            df.group_by(["model", "condition", "app", "caseId"])
            .agg([
                pl.col("normalizedScore").mean().alias("meanScore"),
                pl.len().alias("n"),
            ])
            .sort(["model", "app", "caseId", "condition"])
        )
        _pdf = _agg.to_pandas()
        _pdf["case"] = _pdf["app"] + "/" + _pdf["caseId"]

        _chart = alt.Chart(_pdf).mark_bar(opacity=0.8).encode(
            x=alt.X("meanScore:Q", title="Mean Normalized Score",
                     scale=alt.Scale(domain=[0, 1.05])),
            y=alt.Y("case:N", title="Test Case", sort="-x"),
            color=alt.Color("condition:N", scale=alt.Scale(
                domain=["normal-tools", "code-tool"],
                range=["#E65100", "#1565C0"],
            )),
            xOffset="condition:N",
            row=alt.Row("model:N", title="Model"),
            tooltip=["model:N", "condition:N", "case:N", "meanScore:Q", "n:Q"],
        ).properties(width=400, height=alt.Step(20))

        _out = mo.vstack([
            mo.md("### Per-Case Score Comparison"),
            _chart,
        ])

    _out
    return


if __name__ == "__main__":
    app.run()
