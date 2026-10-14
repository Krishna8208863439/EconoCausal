"""
run_pipeline.py
===============
EconoCausal — Week 1 & 2
Project reference: ITS/DSML/1147

Command-line pipeline orchestrator to execute data generation, preprocessing,
propensity scoring, EDA, and causal DAG generation in a single workflow.

Usage
-----
    python src/run_pipeline.py [--skip-eda] [--skip-dag]
"""

from __future__ import annotations

import argparse
import logging
import sys
import time
from pathlib import Path

# Add project root to path
_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(_ROOT))

from src.causal.diagnostics import run_balance_diagnostics
from src.causal.propensity import run_propensity_analysis
from src.data.generate_data import DEFAULT_N, DEFAULT_SEED, generate_dataset, save_dataset
from src.data.preprocess import run_pipeline as run_preprocessing_pipeline
from src.data.preprocess import save_cleaned

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)


def run_all(
    n_records: int = DEFAULT_N,
    seed: int = DEFAULT_SEED,
    skip_study: bool = False,
    skip_balance: bool = False,
    skip_eda: bool = False,
    skip_dag: bool = False,
) -> dict[str, str]:
    """Execute all pipeline steps sequentially with timing and logging."""
    results = {}
    start_total = time.time()

    # Step 1: Data Generation
    log.info("▶ Step 1/7: Generating synthetic dataset (n=%d, seed=%d) …", n_records, seed)
    df_raw = generate_dataset(n=n_records, seed=seed)
    raw_path = save_dataset(df_raw)
    results["step1_raw"] = str(raw_path)

    # Step 2: Preprocessing
    log.info("▶ Step 2/7: Preprocessing and cleaning dataset …")
    df_clean = run_preprocessing_pipeline(raw_path=raw_path)
    clean_path = save_cleaned(df_clean)
    results["step2_clean"] = str(clean_path)

    # Step 3: Empirical Data Study & Quality Audit
    if not skip_study:
        log.info("▶ Step 3/7: Conducting empirical Data Study & Quality Audit …")
        from src.data.data_study import run_study
        study_path = run_study(raw_path=raw_path, clean_path=clean_path)
        results["step3_study"] = str(study_path)
    else:
        log.info("▶ Step 3/7: Skipping Data Study (--skip-study).")
        results["step3_study"] = "skipped"

    # Step 4: Propensity & Overlap Diagnostics
    log.info("▶ Step 4/7: Estimating propensity scores & overlap diagnostics …")
    propensity_diag = run_propensity_analysis(data_path=clean_path)
    results["step4_auc"] = str(propensity_diag["auc_roc"])
    results["step4_support"] = f"{propensity_diag['common_support_share_pct']}%"

    # Step 5: Covariate Balance & Love Plot
    if not skip_balance:
        log.info("▶ Step 5/7: Evaluating Covariate Balance & Love Plot generation …")
        balance_summary = run_balance_diagnostics(data_path=clean_path)
        results["step5_max_smd"] = str(balance_summary["max_smd_weighted"])
        results["step5_all_balanced"] = str(balance_summary["all_balanced"])
    else:
        log.info("▶ Step 5/7: Skipping Covariate Balance (--skip-balance).")
        results["step5_max_smd"] = "skipped"

    # Step 6: EDA & Visualization
    if not skip_eda:
        log.info("▶ Step 6/7: Running Exploratory Data Analysis (EDA) …")
        from src.data.eda import run_eda
        run_eda()
        results["step6_eda"] = "completed"
    else:
        log.info("▶ Step 6/7: Skipping EDA (--skip-eda).")
        results["step6_eda"] = "skipped"

    # Step 7: Causal DAG
    if not skip_dag:
        log.info("▶ Step 7/7: Building causal DAG …")
        try:
            from src.causal.build_dag import main as run_dag
            run_dag()
            results["step7_dag"] = "completed"
        except ImportError as e:
            log.warning("Causal DAG generation skipped (optional dependency DoWhy): %s", e)
            results["step7_dag"] = "skipped (DoWhy not installed)"
    else:
        log.info("▶ Step 7/7: Skipping DAG (--skip-dag).")
        results["step7_dag"] = "skipped"

    elapsed = time.time() - start_total
    log.info("✔ Pipeline run complete in %.2f seconds.", elapsed)
    return results


def main() -> None:
    parser = argparse.ArgumentParser(description="EconoCausal Pipeline Runner")
    parser.add_argument("--n", type=int, default=DEFAULT_N, help="Number of records to generate")
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED, help="Random seed")
    parser.add_argument("--skip-study", action="store_true", help="Skip empirical data study report generation")
    parser.add_argument("--skip-balance", action="store_true", help="Skip covariate balance & Love plot generation")
    parser.add_argument("--skip-eda", action="store_true", help="Skip EDA figure generation")
    parser.add_argument("--skip-dag", action="store_true", help="Skip DoWhy DAG generation")
    args = parser.parse_args()

    run_all(
        n_records=args.n,
        seed=args.seed,
        skip_study=args.skip_study,
        skip_balance=args.skip_balance,
        skip_eda=args.skip_eda,
        skip_dag=args.skip_dag,
    )


if __name__ == "__main__":
    main()
