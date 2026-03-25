import { format } from 'date-fns'
import { toast } from 'sonner'

export function exportToCSV(data: any[], filename: string, columns: { header: string, maxLen?: number, accessor?: (row: any) => any, forceString?: boolean }[]) {
    if (!data || data.length === 0) {
        toast.error("No data to export.")
        return
    }

    // Extract headers
    const headers = columns.map(c => c.header).join(',')

    // Extract rows
    const csvRows: string[] = [headers]
    
    data.forEach(row => {
        const rowContent = columns.map(c => {
            let val = c.accessor ? c.accessor(row) : ''

            // Handle null/undefined
            if (val === null || val === undefined) val = ''

            // Convert dates if generic (though accessor usually handles format)
            if (val instanceof Date) val = format(val, 'yyyy-MM-dd')

            let str = String(val).replace(/(\r\n|\n|\r)/gm, " ").replace(/"/g, '""')

            // Permanent Solution for Scientific Notation: 
            // If forceString is true or if it's a long numeric string (Mobile/UTR)
            // wrap it in Excel formula format: ="VAL" to prevent auto-conversion to num/scientific
            const looksLikeLongNumber = /^\d{10,}$/.test(str)
            if (c.forceString || looksLikeLongNumber) {
                // Use the ="   " trick for Excel compatibility
                // Adding a \t (tab) inside helps ensure it's treated as string even in weird edge cases
                return `="\t${str}"`
            }

            // If it's already a formula, allow it
            if (str.startsWith('="') && str.endsWith('"')) {
                return str
            }

            // Standard CSV quoting
            if (str.includes(',') || str.includes('"')) {
                return `"${str}"`
            }
            return str
        }).join(',')
        csvRows.push(rowContent)
    })

    const csvContent = csvRows.join("\n")
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `${filename}_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`)
    
    // Append to body to ensure it works in all browsers
    document.body.appendChild(link)
    link.click()
    
    // Cleanup
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}
