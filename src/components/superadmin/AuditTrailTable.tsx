import { Database } from 'lucide-react'

interface AuditLog {
    timestamp: string
    admin: string
    action: string
    details: string
}

interface AuditTrailTableProps {
    logs: AuditLog[]
}

export function AuditTrailTable({ logs }: AuditTrailTableProps) {
    return (
        <div className="space-y-4 animate-fade-in">
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #f0f0f0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#F9FAFB' }}>
                        <tr>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Timestamp</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Admin</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Action</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.length > 0 ? (
                            logs.map((log, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#4B5563' }}>{log.timestamp}</td>
                                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600' }}>{log.admin}</td>
                                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#111827' }}>{log.action}</td>
                                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6B7280' }}>{log.details}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF' }}>
                                    <Database size={48} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
                                    <p>Activity logs will appear as admins perform actions.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
