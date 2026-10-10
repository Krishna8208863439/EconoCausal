"""
build_dag.py
============
EconoCausal — Week 1
Project reference: ITS/DSML/1147

Causal DAG construction and visualisation using DoWhy and networkx.

This script:
1. Loads the cleaned dataset.
2. Defines a causal model using DoWhy specifying:
   - Treatment: discount_offered
   - Outcome: purchased
   - Common causes (confounders): age_group, past_purchases, avg_order_value,
     website_visits, customer_segment
3. Exports a causal DAG image to reports/figures/causal_dag.png.
4. Documents causal assumptions and writes a report to
   reports/week1_causal_analysis.md.

Usage
-----
    python src/causal/build_dag.py

Outputs
-------
    reports/figures/causal_dag.png
    reports/week1_causal_analysis.md (written separately)

Notes
-----
DoWhy 0.8 uses a slightly different API than 0.11+. This script is
compatible with DoWhy 0.8 available on Python 3.14.
"""

from __future__ import annotations

import logging
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import networkx as nx
import pandas as pd

try:
    import dowhy
    from dowhy import CausalModel
except ImportError:
    raise ImportError(
        "DoWhy is required. Install with: pip install dowhy\n"
        "If pygraphviz install fails on Windows, the script will fall back to networkx."
    )

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)

# ── Paths ─────────────────────────────────────────────────────────────────────
_ROOT = Path(__file__).resolve().parents[2]
CLEANED_PATH = _ROOT / "data" / "processed" / "cleaned_retail_campaign.csv"
FIGURES_DIR  = _ROOT / "reports" / "figures"
DAG_PNG      = FIGURES_DIR / "causal_dag.png"


# ── Causal model definition ───────────────────────────────────────────────────

TREATMENT = "discount_offered"
OUTCOME   = "purchased"

# Pre-treatment confounders — variables that influence both treatment assignment
# and outcome, measured before the campaign.
COMMON_CAUSES = [
    "age_group",
    "past_purchases",
    "avg_order_value",
    "website_visits",
    "customer_segment",
]

# Excluded variables with justification:
# - customer_id: identifier only, no causal role.
# - discount_amount: set after treatment assignment; treatment attribute, not confounder.
# - revenue: post-treatment outcome; conditioning on it introduces collider bias.
# - campaign_date: administrative timestamp; no causal relationship with outcome.
# - is_outlier: quality flag, not a pre-treatment variable.

# GML-format DAG string for DoWhy (compatible with 0.8 API)
#   Format: "node1 [label]" or "node1->node2"
#   We'll use the DoWhy CausalModel constructor with common_causes parameter,
#   which implicitly constructs the DAG:
#       common_causes -> treatment
#       common_causes -> outcome
#       treatment -> outcome


def build_causal_model(df: pd.DataFrame) -> CausalModel:
    """
    Build a DoWhy CausalModel for the discount → purchase causal question.

    Parameters
    ----------
    df : pd.DataFrame
        Cleaned dataset.

    Returns
    -------
    CausalModel
        DoWhy model object with specified treatment, outcome, and confounders.
    """
    log.info("Building causal model with DoWhy …")
    log.info("  Treatment      : %s", TREATMENT)
    log.info("  Outcome        : %s", OUTCOME)
    log.info("  Common causes  : %s", COMMON_CAUSES)

    # DoWhy 0.8 constructor signature
    model = CausalModel(
        data=df,
        treatment=TREATMENT,
        outcome=OUTCOME,
        common_causes=COMMON_CAUSES,
    )
    log.info("Causal model constructed.")
    return model


def visualise_dag_networkx(
    model: CausalModel,
    output_path: Path = DAG_PNG,
) -> None:
    """
    Render the causal DAG using networkx + matplotlib.

    This fallback method works on any platform without requiring graphviz binaries.
    """
    log.info("Rendering DAG with networkx + matplotlib …")

    # Extract the networkx DiGraph from DoWhy's internal CausalGraph object.
    # DoWhy 0.8:  model._graph  is a CausalGraph wrapper;
    #             model._graph._graph  is the underlying networkx DiGraph.
    G = None
    if hasattr(model, "_graph"):
        causal_graph = model._graph
        if hasattr(causal_graph, "_graph"):
            G = causal_graph._graph       # networkx DiGraph inside the wrapper
        elif isinstance(causal_graph, nx.DiGraph):
            G = causal_graph

    if G is None or not hasattr(G, "nodes"):
        # Final fallback: manually reconstruct the DAG from specification
        log.warning("Could not extract networkx graph from DoWhy model; manually reconstructing DAG.")
        G = nx.DiGraph()
        G.add_node(TREATMENT)
        G.add_node(OUTCOME)
        for cause in COMMON_CAUSES:
            G.add_node(cause)
            G.add_edge(cause, TREATMENT)
            G.add_edge(cause, OUTCOME)
        G.add_edge(TREATMENT, OUTCOME)

    # Hierarchical layout
    #   Layer 0: common causes
    #   Layer 1: treatment
    #   Layer 2: outcome
    pos = {}
    n_causes = len(COMMON_CAUSES)
    x_spacing = 1.5
    y_spacing = 3.0
    
    # Position confounders in top row
    for i, cause in enumerate(COMMON_CAUSES):
        x_offset = (i - (n_causes - 1) / 2) * x_spacing
        pos[cause] = (x_offset, 2 * y_spacing)
    
    # Treatment and outcome in middle and bottom
    pos[TREATMENT] = (0, y_spacing)
    pos[OUTCOME]   = (0, 0)

    fig, ax = plt.subplots(figsize=(12, 8))
    
    # Node colors
    node_colors = []
    for node in G.nodes():
        if node == TREATMENT:
            node_colors.append("#2196F3")   # blue
        elif node == OUTCOME:
            node_colors.append("#4CAF50")   # green
        else:
            node_colors.append("#FF9800")   # orange (confounders)

    nx.draw_networkx_nodes(
        G, pos, ax=ax, node_size=3000, node_color=node_colors, alpha=0.9
    )
    nx.draw_networkx_labels(
        G, pos, ax=ax, font_size=9, font_weight="bold", font_color="white"
    )
    nx.draw_networkx_edges(
        G, pos, ax=ax, edge_color="gray", arrows=True,
        arrowstyle="->", arrowsize=20, width=1.5, alpha=0.6
    )

    ax.set_title(
        "Causal DAG: Discount → Purchase\n"
        "(Pre-treatment confounders must be adjusted to identify the treatment effect)",
        fontsize=14, fontweight="bold", pad=20,
    )
    ax.axis("off")
    fig.tight_layout()

    output_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    log.info("DAG visualisation saved → %s", output_path)


# ── Report generation ─────────────────────────────────────────────────────────

def generate_report(model: CausalModel, output_path: Path) -> None:
    """Write a markdown report documenting the causal assumptions."""
    log.info("Generating causal analysis report …")

    # DoWhy 0.8 does not expose a .summary() method like later versions;
    # we document the structure manually.

    report_lines = [
        "# EconoCausal — Week 1 Causal Analysis Report\n",
        "\n",
        "**Project:** EconoCausal: Dynamic Pricing via Double Machine Learning  \n",
        "**Reference:** ITS/DSML/1147  \n",
        "**Date:** 2026-10-10  \n",
        "**DoWhy version:** " + dowhy.__version__ + "  \n",
        "\n",
        "---\n",
        "\n",
        "## 1. Causal Question\n",
        "\n",
        "**Does offering a promotional discount cause an increase in purchase probability?**\n",
        "\n",
        "More formally:\n",
        "\n",
        "> What is the **Average Treatment Effect (ATE)** of `discount_offered` on `purchased`,\n",
        "> adjusting for pre-treatment confounders?\n",
        "\n",
        "Let:\n",
        "- *T* = `discount_offered` (binary: 0 = control, 1 = treated)\n",
        "- *Y* = `purchased` (binary: 0 = did not purchase, 1 = purchased)\n",
        "- *X* = vector of pre-treatment covariates (confounders)\n",
        "\n",
        "The causal estimand is:\n",
        "\n",
        "$$\n",
        "\\tau = \\mathbb{E}[Y(1) - Y(0)]\n",
        "$$\n",
        "\n",
        "where *Y(1)* and *Y(0)* are the potential outcomes under treatment and control.\n",
        "\n",
        "---\n",
        "\n",
        "## 2. Causal Graph (DAG)\n",
        "\n",
        "![Causal DAG](figures/causal_dag.png)\n",
        "\n",
        "### Graph Structure\n",
        "\n",
        "- **Treatment node:** `discount_offered`\n",
        "- **Outcome node:** `purchased`\n",
        "- **Common causes (confounders):**\n",
        "  - `age_group`\n",
        "  - `past_purchases`\n",
        "  - `avg_order_value`\n",
        "  - `website_visits`\n",
        "  - `customer_segment`\n",
        "\n",
        "Each confounder has a directed edge to both the treatment and the outcome,\n",
        "representing that these variables influence:\n",
        "1. **Which customers are offered a discount** (treatment propensity).\n",
        "2. **Whether a customer purchases** (baseline outcome probability).\n",
        "\n",
        "The treatment node has a directed edge to the outcome, representing the\n",
        "hypothesised causal effect we wish to estimate.\n",
        "\n",
        "---\n",
        "\n",
        "## 3. Identification Assumptions\n",
        "\n",
        "To interpret an estimated treatment effect as causal, the following\n",
        "assumptions must hold:\n",
        "\n",
        "### 3.1 Consistency (SUTVA — Stable Unit Treatment Value Assumption)\n",
        "\n",
        "- The potential outcome *Y(t)* is well-defined for each customer.\n",
        "- One customer's treatment does not affect another customer's outcome\n",
        "  (no interference).\n",
        "- There is only one version of the treatment (e.g., all discounts are\n",
        "  equivalent in mechanism).\n",
        "\n",
        "**Assessment for this dataset:**  \n",
        "Plausible if customers do not influence each other's purchase decisions.\n",
        "Violations may occur if discounts trigger social sharing or competitive effects.\n",
        "\n",
        "### 3.2 Positivity (Overlap)\n",
        "\n",
        "- Every customer has a non-zero probability of receiving both treatment\n",
        "  and control:\n",
        "\n",
        "$$\n",
        "0 < P(T=1 \\mid X=x) < 1 \\quad \\forall x \\in \\text{support}(X)\n",
        "$$\n",
        "\n",
        "**Assessment:**  \n",
        "Week 1 EDA (Figure 8) shows overlap in confounder distributions between\n",
        "treated and control groups. Propensity scores will be checked in Week 2.\n",
        "\n",
        "### 3.3 Conditional Exchangeability (Unconfoundedness, Ignorability)\n",
        "\n",
        "- Treatment assignment is independent of potential outcomes, conditional\n",
        "  on the observed covariates *X*:\n",
        "\n",
        "$$\n",
        "\\{Y(0), Y(1)\\} \\perp T \\mid X\n",
        "$$\n",
        "\n",
        "This assumption requires that **all common causes of treatment and outcome\n",
        "are observed and included in *X*.** Unmeasured confounding violates this\n",
        "assumption and biases the estimate.\n",
        "\n",
        "**Assessment:**  \n",
        "The five confounders listed above were selected based on:\n",
        "1. Temporal precedence: all are measured before the campaign.\n",
        "2. Plausibility: customer history, engagement, and segment logically\n",
        "   influence both targeting decisions and purchase propensity.\n",
        "\n",
        "**Limitation:**  \n",
        "We cannot rule out unmeasured confounders such as:\n",
        "- Brand affinity or loyalty not captured by `past_purchases`.\n",
        "- External promotions or seasonal effects not recorded.\n",
        "- Latent customer preferences.\n",
        "\n",
        "Sensitivity analyses (e.g., refutation tests in DoWhy) and domain\n",
        "knowledge reviews are recommended.\n",
        "\n",
        "---\n",
        "\n",
        "## 4. Variable Roles and Exclusions\n",
        "\n",
        "### Included in the Adjustment Set (Confounders)\n",
        "\n",
        "| Variable | Rationale |\n",
        "|----------|----------|\n",
        "| `age_group` | Demographic segment; may affect targeting and purchase behaviour. |\n",
        "| `past_purchases` | Strong predictor of both treatment propensity and outcome. |\n",
        "| `avg_order_value` | Spending capacity; correlated with treatment and baseline purchase rate. |\n",
        "| `website_visits` | Engagement proxy; affects targeting and purchase likelihood. |\n",
        "| `customer_segment` | CRM-assigned segment (Premium/Regular/Occasional/Lapsed); confounds both treatment and outcome. |\n",
        "\n",
        "### Excluded from the Adjustment Set\n",
        "\n",
        "| Variable | Reason for exclusion |\n",
        "|----------|----------------------|\n",
        "| `customer_id` | Unique identifier with no causal meaning. Including it would create spurious one-to-one mappings. |\n",
        "| `discount_amount` | Determined **after** treatment assignment; it is a treatment attribute, not a pre-treatment confounder. |\n",
        "| `revenue` | **Post-treatment variable.** Measured after the campaign window. Conditioning on a post-treatment variable opens collider paths and introduces bias. Use `revenue` as an alternative outcome, not a covariate. |\n",
        "| `campaign_date` | Administrative timestamp with no causal relationship to the outcome. |\n",
        "| `is_outlier` | Data-quality flag, not a pre-treatment causal variable. |\n",
        "\n",
        "---\n",
        "\n",
        "## 5. Causal Concepts Summary\n",
        "\n",
        "### Confounders\n",
        "Variables that influence both treatment and outcome. Failing to adjust for\n",
        "confounders biases the treatment-effect estimate.\n",
        "\n",
        "### Mediators\n",
        "Variables on the causal path between treatment and outcome (e.g., if the\n",
        "discount changes customer engagement, which then changes purchase). Do **not**\n",
        "condition on mediators when estimating the **total treatment effect**.\n",
        "\n",
        "### Colliders\n",
        "Variables caused by both treatment and outcome, or by variables on separate\n",
        "causal paths. Conditioning on a collider opens spurious associations and\n",
        "biases the estimate.\n",
        "\n",
        "**Example in this dataset:**  \n",
        "`revenue` is a post-treatment variable determined by both `discount_offered`\n",
        "(treatment) and `purchased` (outcome). Conditioning on it introduces collider\n",
        "bias.\n",
        "\n",
        "---\n",
        "\n",
        "## 6. Identification Strategy\n",
        "\n",
        "Given the DAG and assumptions, the causal effect is identified by:\n",
        "\n",
        "1. **Conditioning on the adjustment set** (backdoor criterion satisfied).\n",
        "2. Estimating:\n",
        "\n",
        "$$\n",
        "\\tau = \\mathbb{E}_X \\left[ \\mathbb{E}[Y \\mid T=1, X] - \\mathbb{E}[Y \\mid T=0, X] \\right]\n",
        "$$\n",
        "\n",
        "In Week 2, we will estimate this using **Double Machine Learning (DML)**,\n",
        "which uses flexible machine-learning models to estimate the conditional\n",
        "expectations *m(X) = E[Y|X]* and *e(X) = E[T|X]*, then constructs an\n",
        "orthogonalised moment condition to reduce bias from model misspecification.\n",
        "\n",
        "---\n",
        "\n",
        "## 7. Limitations and Caveats\n",
        "\n",
        "1. **Unmeasured confounding:**  \n",
        "   The conditional exchangeability assumption is untestable. Sensitivity\n",
        "   analyses can quantify how strong an unmeasured confounder would need to\n",
        "   be to overturn the conclusion.\n",
        "\n",
        "2. **Data quality:**  \n",
        "   This analysis uses synthetic data. Real-world data may have additional\n",
        "   confounders, measurement error, and selection issues.\n",
        "\n",
        "3. **Generalisability:**  \n",
        "   The estimated effect applies to the observed sample and time period.\n",
        "   External validity (whether the effect holds in other populations or\n",
        "   contexts) requires additional evidence.\n",
        "\n",
        "4. **Treatment definition:**  \n",
        "   All discounts are treated as a single binary intervention. Heterogeneity\n",
        "   in discount amounts or mechanisms is not modelled here.\n",
        "\n",
        "---\n",
        "\n",
        "## 8. Next Steps\n",
        "\n",
        "- **Week 2:** Fit a DML estimator (EconML `LinearDML` or `CausalForestDML`)\n",
        "  using the identified adjustment set.\n",
        "- Estimate the ATE and Conditional ATE (CATE) by customer segment.\n",
        "- Check propensity overlap and perform refutation tests.\n",
        "- Compare the adjusted estimate with the naïve difference from Week 1 EDA.\n",
        "\n",
        "---\n",
        "\n",
        "*Generated by `src/causal/build_dag.py` — EconoCausal Week 1*\n",
    ]

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.writelines(report_lines)
    log.info("Causal analysis report saved → %s", output_path)


# ── Pipeline ──────────────────────────────────────────────────────────────────

def main() -> None:
    log.info("Loading cleaned dataset from %s", CLEANED_PATH)
    df = pd.read_csv(CLEANED_PATH)
    log.info("Dataset loaded: %d rows, %d columns.", len(df), df.shape[1])

    model = build_causal_model(df)
    visualise_dag_networkx(model, output_path=DAG_PNG)

    report_path = _ROOT / "reports" / "week1_causal_analysis.md"
    generate_report(model, output_path=report_path)

    log.info("Causal DAG and report complete.")


if __name__ == "__main__":
    main()
