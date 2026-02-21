import { format } from 'date-fns'
import { toast } from 'sonner'

export function exportToCSV(data: any[], filename: string, columns: { header: string, maxLen?: number, accessor?: (row: any) => any }[]) {
    if (!data || data.length === 0) {
        toast.error("No data to export.")
        return
    }

    // Extract headers
    const headers = columns.map(c => c.header).join(',')

    // Extract rows
    const rows = data.map(row => {
        return columns.map(c => {
            let val = c.accessor ? c.accessor(row) : ''

            // Handle null/undefined
            if (val === null || val === undefined) val = ''

            // Convert dates if generic (though accessor usually handles format)
            if (val instanceof Date) val = format(val, 'yyyy-MM-dd')

            // Clean string: Remove newlines, escape commas, quotes
            const str = String(val).replace(/(\r\n|\n|\r)/gm, " ").replace(/"/g, '""')

            // If it's already a formula (starts with ="), allow it to pass through
            if (String(val).startsWith('="')) {
                return String(val)
            }

            // Actually, simple CSV: just quote if contains comma
            if (str.includes(',') || str.includes('"')) {
                return `"${str}"`
            }
            return str
        }).join(',')
    })

    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `${filename}_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}
