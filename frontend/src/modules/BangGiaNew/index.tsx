import DataGrid, { Column } from '../../components/DataGrid'
import { useParams } from 'react-router-dom'
import configs from '../../lib/bangGiaConfigs'

export default function BangGiaNewPage() {
  const { slug } = useParams()
  const cfg = configs.find(c => c.apiPath.endsWith(slug!))
  if (!cfg) return <div style={{ padding: 24, color: '#999' }}>Unknown pricing table</div>
  return <DataGrid title={cfg.title} columns={cfg.columns} apiPath={cfg.apiPath} />
}
