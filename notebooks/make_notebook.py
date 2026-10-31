"""Helper script to generate notebooks/01_week1_eda.ipynb programmatically."""
import json
import pathlib
import uuid


def md(lines):
    return {"cell_type": "markdown", "id": str(uuid.uuid4())[:8],
            "metadata": {}, "source": lines}


def code(lines):
    return {"cell_type": "code", "id": str(uuid.uuid4())[:8],
            "metadata": {}, "source": lines, "outputs": [], "execution_count": None}


nb = {
    "nbformat": 4,
    "nbformat_minor": 5,
    "metadata": {
        "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
        "language_info": {"name": "python", "version": "3.10.0"},
    },
    "cells": [
        md([
            "# EconoCausal — Week 1 EDA Notebook\n",
            "**Project reference:** ITS/DSML/1147\n\n",
            "Runs the full EDA for the synthetic retail campaign dataset.\n\n",
            "> **Data notice:** All data is entirely synthetic — no real customers.",
        ]),

        code([
            "import sys, pathlib\n",
            "sys.path.insert(0, str(pathlib.Path('.').resolve().parent))\n\n",
            "import pandas as pd\n",
            "import matplotlib\n",
            "matplotlib.use('inline')\n",
            "from IPython.display import Image, display\n",
            "print('Dependencies loaded.')",
        ]),

        md(["## 1. Load Cleaned Dataset"]),
        code([
            "df = pd.read_csv('../data/processed/cleaned_retail_campaign.csv')\n",
            "print(f'Shape: {df.shape}')\n",
            "df.head()",
        ]),

        md(["## 2. Descriptive Statistics"]),
        code(["df.describe(include='all')"]),

        md(["## 3. Missing Values and Duplicates"]),
        code([
            "print('Missing values per column:')\n",
            "print(df.isnull().sum())\n",
            "print(f'\\nDuplicate rows: {df.duplicated().sum()}')\n",
            "outlier_count = int(df['is_outlier'].sum())\n",
            "outlier_pct = 100 * df['is_outlier'].mean()\n",
            "print(f'Outlier-flagged rows: {outlier_count} ({outlier_pct:.1f}%)')",
        ]),

        md(["## 4. Treatment and Control Group Sizes"]),
        code([
            "display(Image('../reports/figures/01_treatment_control_counts.png'))\n",
            "print(df['discount_offered'].value_counts())",
        ]),

        md([
            "## 5. Purchase Rate: Naïve Comparison\n\n",
            "> The gap shown here is **not** the causal effect of the discount — "
            "it conflates the discount effect with confounding from pre-treatment variables.",
        ]),
        code([
            "display(Image('../reports/figures/02_purchase_rate_by_treatment.png'))\n",
            "treated_rate = df.loc[df['discount_offered']==1, 'purchased'].mean()\n",
            "control_rate  = df.loc[df['discount_offered']==0, 'purchased'].mean()\n",
            "naive_ate = treated_rate - control_rate\n",
            "print(f'Treated purchase rate : {treated_rate:.1%}')\n",
            "print(f'Control purchase rate : {control_rate:.1%}')\n",
            "print(f'Naïve ATE (biased)    : {naive_ate:+.1%}')\n",
            "print(f'True embedded ATE     : ~+8.0%  (by design in the DGP)')",
        ]),

        md(["## 6. Numeric Feature Distributions"]),
        code(["display(Image('../reports/figures/03_numeric_distributions.png'))"]),

        md(["## 7. Categorical Feature Distributions"]),
        code(["display(Image('../reports/figures/04_categorical_distributions.png'))"]),

        md([
            "## 8. Correlation Heatmap\n\n",
            "> Correlation is a descriptive tool only and does not imply causation.",
        ]),
        code(["display(Image('../reports/figures/05_correlation_heatmap.png'))"]),

        md(["## 9. Purchase Rate by Segment and Age Group"]),
        code([
            "display(Image('../reports/figures/06_purchase_rate_by_segment.png'))\n",
            "display(Image('../reports/figures/07_purchase_rate_by_age_group.png'))",
        ]),

        md(["## 10. Confounder Evidence"]),
        code(["display(Image('../reports/figures/08_propensity_by_confounder.png'))"]),

        md([
            "## 11. Why the Naïve Estimate Is Biased\n\n",
            "Treatment was **not randomly assigned**. Customers with more `past_purchases`,\n",
            "higher `website_visits`, and Premium/Regular segments had higher treatment\n",
            "propensity AND higher baseline purchase probability.\n\n",
            "**Double Machine Learning (Week 2)** removes this bias by:\n",
            "1. Partialling out confounder effects from both outcome and treatment.\n",
            "2. Estimating the treatment effect from the residualised relationship.",
        ]),

        md(["## 12. Summary"]),
        code([
            "summary = {\n",
            "    'n_total'         : len(df),\n",
            "    'n_treated'       : int((df['discount_offered']==1).sum()),\n",
            "    'n_control'       : int((df['discount_offered']==0).sum()),\n",
            "    'naive_ate'       : round(float(naive_ate), 4),\n",
            "    'true_ate_approx' : 0.08,\n",
            "    'confounders'     : ['past_purchases','avg_order_value',\n",
            "                         'website_visits','customer_segment','age_group'],\n",
            "}\n",
            "for k, v in summary.items():\n",
            "    print(f'{k:28s}: {v}')",
        ]),
    ],
}

out = pathlib.Path(__file__).parent / "01_week1_eda.ipynb"
with open(out, "w", encoding="utf-8") as f:
    json.dump(nb, f, indent=1)
print(f"Notebook written → {out}")
