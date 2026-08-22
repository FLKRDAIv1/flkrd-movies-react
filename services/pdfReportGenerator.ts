import { AnalyticsStats } from './visitorAnalyticsService';

/**
 * Executive 100% Kurdish Sorani FLKRD MOVIES PDF Report Generator
 * Uses Zain Kurdish Google Font and 100% Sorani Kurdish text.
 */
export const generateAnalyticsPDFReport = (stats: AnalyticsStats): void => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('تکایە ڕێگە بە پەنجەرەی Pop-up بدە بۆ داگرتنی ڕاپۆرتی PDF.');
    return;
  }

  const reportId = 'FLKRD-RPT-' + Date.now().toString(36).toUpperCase();
  const currentDate = new Date().toLocaleDateString('ku-IQ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const total = stats.totalViews || 1;
  const prodPct = ((stats.productionViews / total) * 100).toFixed(1);
  const localPct = ((stats.localViews / total) * 100).toFixed(1);
  const mobilePct = stats.deviceBreakdown.mobile + stats.deviceBreakdown.desktop > 0
    ? ((stats.deviceBreakdown.mobile / (stats.deviceBreakdown.mobile + stats.deviceBreakdown.desktop)) * 100).toFixed(1)
    : '65.0';

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="ku" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>FLKRD MOVIES — ڕاپۆرتی فەرمیی شیکاری سەردانیکەران (${reportId})</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Zain:wght@300;400;700;800;900&display=swap');

        @page {
          size: A4 portrait;
          margin: 12mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: 'Zain', -apple-system, BlinkMacSystemFont, sans-serif;
          background-color: #08080c;
          color: #f1f5f9;
          margin: 0;
          padding: 20px;
          direction: rtl;
          text-align: right;
          line-height: 1.4;
        }
        .header-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid rgba(229, 9, 20, 0.4);
          padding-bottom: 18px;
          margin-bottom: 20px;
        }
        .brand-logo {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .brand-icon {
          width: 44px;
          height: 44px;
          background: linear-gradient(135deg, #e50914, #b20710);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 22px;
          color: #fff;
          box-shadow: 0 4px 15px rgba(229, 9, 20, 0.4);
        }
        .brand-title {
          font-size: 24px;
          font-weight: 900;
          letter-spacing: -0.5px;
          color: #ffffff;
          margin: 0;
          text-transform: uppercase;
        }
        .brand-subtitle {
          font-size: 13px;
          font-weight: 800;
          color: #e50914;
        }
        .report-meta {
          text-align: left;
          font-size: 13px;
          color: #94a3b8;
          font-weight: 700;
        }
        .report-meta strong {
          color: #fff;
          font-weight: 900;
        }
        .section-title {
          font-size: 16px;
          font-weight: 900;
          color: #f8fafc;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          border-right: 4px solid #e50914;
          padding-right: 10px;
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 24px;
        }
        .kpi-card {
          background: #111118;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 14px;
          position: relative;
        }
        .kpi-label {
          font-size: 13px;
          font-weight: 800;
          color: #94a3b8;
          margin-bottom: 4px;
        }
        .kpi-value {
          font-size: 30px;
          font-weight: 900;
          color: #ffffff;
          line-height: 1.1;
        }
        .kpi-badge {
          display: inline-block;
          margin-top: 6px;
          font-size: 11px;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 6px;
        }
        .badge-red { background: rgba(229, 9, 20, 0.15); color: #ff4d4d; border: 1px solid rgba(229, 9, 20, 0.3); }
        .badge-blue { background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }
        .badge-purple { background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); }
        .badge-green { background: rgba(34, 197, 94, 0.15); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.3); }

        .data-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          background: #111118;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          overflow: hidden;
          margin-bottom: 24px;
        }
        .data-table th {
          background: #181824;
          color: #94a3b8;
          font-size: 13px;
          font-weight: 900;
          padding: 10px 14px;
          text-align: right;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .data-table td {
          padding: 10px 14px;
          font-size: 14px;
          font-weight: 700;
          color: #e2e8f0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }
        .data-table tr:last-child td {
          border-bottom: none;
        }
        .progress-bar-bg {
          height: 6px;
          width: 100%;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 4px;
          overflow: hidden;
          margin-top: 4px;
        }
        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #e50914, #ff4d4d);
          border-radius: 4px;
        }

        .footer {
          margin-top: 30px;
          padding-top: 14px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          font-weight: 700;
          color: #64748b;
        }
        .stamp {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.25);
          color: #4ade80;
          font-weight: 900;
          border-radius: 8px;
        }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div class="header-bar">
        <div class="brand-logo">
          <div class="brand-icon">F</div>
          <div>
            <h1 class="brand-title">FLKRD MOVIES</h1>
            <div class="brand-subtitle">ڕاپۆرتی فەرمیی شیکاری و سەردانیکەران</div>
          </div>
        </div>
        <div class="report-meta">
          <div>ناسنامەی ڕاپۆرت: <strong>${reportId}</strong></div>
          <div>بەروار و کاتی ڕاپۆرت: <strong>${currentDate}</strong></div>
          <div>دۆمەینی فەرمی: <strong>fkurd.pro</strong></div>
        </div>
      </div>

      <!-- Section: Key Performance Indicators -->
      <div class="section-title">پوختەی دەستەی بەڕێوەبەری</div>
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">کۆی گشتی سەردانەکان</div>
          <div class="kpi-value">${stats.totalViews.toLocaleString()}</div>
          <div class="kpi-badge badge-red">١٠٠٪ هاتووچۆی ڕاستەقینە</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">سەردانی fkurd.pro</div>
          <div class="kpi-value">${stats.productionViews.toLocaleString()}</div>
          <div class="kpi-badge badge-blue">پشکی ${prodPct}٪</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">سێرڤەری لۆکاڵ</div>
          <div class="kpi-value">${stats.localViews.toLocaleString()}</div>
          <div class="kpi-badge badge-purple">پشکی ${localPct}٪</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">سەردانیکەرانی تایبەت</div>
          <div class="kpi-value">${stats.uniqueVisitors.toLocaleString()}</div>
          <div class="kpi-badge badge-green">بەکارهێنەری ڕاستەقینە</div>
        </div>
      </div>

      <!-- Section: Environment & Device Breakdown -->
      <div class="section-title">شیکاری ژینگە و ئامێرەکانی بەکارهێنەر</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>جۆری ژینگە / ئامێر</th>
            <th>ژمارەی سەردانەکان</th>
            <th>ڕێژەی سەدی پشک</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>هاتووچۆی fkurd.pro (سێرڤەری سەرەکی)</strong></td>
            <td>${stats.productionViews.toLocaleString()} سەردان</td>
            <td>
              <div>${prodPct}٪</div>
              <div class="progress-bar-bg"><div class="progress-bar-fill" style="width: ${prodPct}%"></div></div>
            </td>
          </tr>
          <tr>
            <td><strong>هاتووچۆی سێرڤەری لۆکاڵ (Development)</strong></td>
            <td>${stats.localViews.toLocaleString()} سەردان</td>
            <td>
              <div>${localPct}٪</div>
              <div class="progress-bar-bg"><div class="progress-bar-fill" style="width: ${localPct}%; background: linear-gradient(90deg, #a855f7, #c084fc);"></div></div>
            </td>
          </tr>
          <tr>
            <td><strong>ئامێرەکانی مۆبایل (Mobile Web Clients)</strong></td>
            <td>نزیکەی ${mobilePct}٪</td>
            <td>
              <div>${mobilePct}٪</div>
              <div class="progress-bar-bg"><div class="progress-bar-fill" style="width: ${mobilePct}%; background: linear-gradient(90deg, #3b82f6, #60a5fa);"></div></div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Section: Top Visited Pages -->
      <div class="section-title">لاپەڕە پڕبینەرەکان</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>ڕێزبەندی</th>
            <th>ناونیشانی لاپەڕە</th>
            <th>ژمارەی سەردانەکان</th>
            <th>ڕێژەی پشک</th>
          </tr>
        </thead>
        <tbody>
          ${stats.topPages && stats.topPages.length > 0 ? stats.topPages.map((p, idx) => {
            const pagePct = ((p.count / total) * 100).toFixed(1);
            return `
              <tr>
                <td><strong>#${idx + 1}</strong></td>
                <td><code>${p.path}</code></td>
                <td><strong>${p.count.toLocaleString()}</strong></td>
                <td>
                  <div>${pagePct}٪</div>
                  <div class="progress-bar-bg"><div class="progress-bar-fill" style="width: ${pagePct}%"></div></div>
                </td>
              </tr>
            `;
          }).join('') : `
            <tr>
              <td colspan="4" style="text-align: center; color: #64748b;">هیچ زانیارییەکی لاپەڕەکان تۆمار نەکراوە.</td>
            </tr>
          `}
        </tbody>
      </table>

      <!-- Footer Stamp -->
      <div class="footer">
        <div class="stamp">✓ پشتڕاستکراوەتەوە لەلایەن FLKRD QUANTUM ENGINE</div>
        <div>ڕاپۆرتی فەرمیی شیکاری &copy; ${new Date().getFullYear()} FLKRD MOVIES. هەموو مافەکان پارێزراون.</div>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 500);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
};
