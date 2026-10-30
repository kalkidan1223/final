require('dotenv').config();
const { query } = require('../src/config/db');
(async () => {
  const t = await query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('age_groups','grade_levels','students')");
  console.log('tables:', t.rows);
  const ag = await query("SELECT column_name FROM information_schema.columns WHERE table_name='age_groups' ORDER BY ordinal_position");
  console.log('age_groups cols:', ag.rows.map(x=>x.column_name).join(', '));
  const gl = await query("SELECT column_name FROM information_schema.columns WHERE table_name='grade_levels' ORDER BY ordinal_position");
  console.log('grade_levels cols:', gl.rows.map(x=>x.column_name).join(', '));
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });