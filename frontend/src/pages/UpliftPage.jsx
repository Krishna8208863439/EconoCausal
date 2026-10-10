import React from 'react'
import SectionCard from '../components/SectionCard.jsx'
import PlannedFeature from '../components/PlannedFeature.jsx'
import './Page.css'

export default function UpliftPage() {
  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Uplift Analysis</h1>
        <span className="badge badge-gray">Week 2 — Planned</span>
      </div>

      <div className="notice-banner notice-banner--warning">
        <span aria-hidden="true">🔜</span>
        <span>
          This section will display causal treatment-effect estimates and uplift visualisations
          once the Double Machine Learning estimator is implemented in Week 2.
          <strong> No model estimates are shown here yet.</strong>
        </span>
      </div>

      <SectionCard title="Planned Uplift Features" badge="Week 2">
        <PlannedFeature
          week={2}
          feature="Treatment Effect Distribution"
          description="Histogram of estimated Conditional Average Treatment Effects (CATE) across the customer population. Will use Plotly.js for interactive exploration."
        />
        <PlannedFeature
          week={2}
          feature="Uplift Curve"
          description="Cumulative gain curve showing incremental purchase uplift as a function of the fraction of customers targeted. Compares the DML targeting policy against random allocation."
        />
        <PlannedFeature
          week={2}
          feature="Policy Comparison Chart"
          description="Side-by-side comparison of: no-discount, random-discount, blanket-discount, and DML-targeted strategies across estimated incremental conversions and budget spent."
        />
        <PlannedFeature
          week={2}
          feature="Segment-Level CATE Heatmap"
          description="Visualises average treatment effects broken down by customer_segment and age_group to reveal which customer types benefit most from a discount."
        />
        <PlannedFeature
          week={3}
          feature="Budget vs. Uplift Trade-off Plot"
          description="Shows how estimated incremental conversions vary with different budget levels, enabling the marketing analyst to calibrate the campaign spend."
        />
      </SectionCard>

      <SectionCard title="Why the Naïve Comparison Is Insufficient">
        <p className="prose">
          A simple comparison of purchase rates between treated and untreated customers
          conflates the causal effect of the discount with pre-existing differences between groups.
          In the synthetic dataset, the naïve difference is approximately <strong>+20.9 pp</strong>,
          while the true embedded causal effect is approximately <strong>+8 pp</strong>.
        </p>
        <p className="prose">
          Double Machine Learning corrects this by:
        </p>
        <ol className="prose-list">
          <li>Fitting a model for <em>E[Y | X]</em> (outcome nuisance) using machine learning.</li>
          <li>Fitting a model for <em>E[T | X]</em> (treatment propensity) using machine learning.</li>
          <li>Computing residuals <em>Ỹ = Y − Ê[Y|X]</em> and <em>T̃ = T − Ê[T|X]</em>.</li>
          <li>Regressing <em>Ỹ</em> on <em>T̃</em> to obtain the ATE estimate, orthogonal to confounder effects.</li>
        </ol>
        <p className="prose">
          This section will show the corrected estimates once Week 2 is complete.
        </p>
      </SectionCard>
    </div>
  )
}
